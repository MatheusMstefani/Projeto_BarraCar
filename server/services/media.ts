import { DomainError } from "@/lib/errors";
import { fileTypeFromBuffer } from "file-type";
import {
  DamageType,
  PhotoCategory,
  Prisma,
  Role,
  SignatureType,
  VehicleRegion,
  WorkOrderStatus,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { privateStorage, type PrivateStorage } from "@/lib/storage";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const lockedStatuses = new Set<WorkOrderStatus>([
  WorkOrderStatus.FINISHED,
  WorkOrderStatus.AWAITING_PICKUP,
  WorkOrderStatus.DELIVERED,
]);

export async function validateImage(
  bytes: Uint8Array,
  maxBytes = Number(
    process.env.MAX_PHOTO_SIZE_MB ?? process.env.MAX_IMAGE_SIZE_MB ?? 10,
  ) *
    1024 *
    1024,
) {
  if (!bytes.length || bytes.length > maxBytes)
    throw new DomainError("A imagem excede o tamanho máximo permitido.");
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !imageTypes.has(detected.mime))
    throw new DomainError("Formato inválido. Envie JPG, PNG ou WEBP.");
  return detected;
}

export async function addPhoto(
  input: {
    workOrderId: string;
    category: PhotoCategory;
    region: VehicleRegion;
    damageType?: DamageType;
    description?: string;
    checklistItemId?: string;
    workOrderItemId?: string;
    originalName: string;
    capturedAt?: Date;
    bytes: Uint8Array;
  },
  actorId: string,
  storage: PrivateStorage = privateStorage,
) {
  const type = await validateImage(input.bytes);
  if (input.category === PhotoCategory.DAMAGE && !input.damageType)
    throw new DomainError("Informe o tipo da avaria.");
  const originalName = input.originalName
    .trim()
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 255);
  if (!originalName) throw new DomainError("Nome de arquivo inválido.");
  const order = await db.workOrder.findUniqueOrThrow({
    where: { id: input.workOrderId },
  });
  if (input.checklistItemId)
    await db.workOrderChecklistItem.findFirstOrThrow({
      where: { id: input.checklistItemId, workOrderId: order.id },
    });
  if (input.workOrderItemId)
    await db.workOrderItem.findFirstOrThrow({
      where: { id: input.workOrderItemId, workOrderId: order.id },
    });
  const photoId = randomUUID();
  const key = `work-orders/${order.id}/photos/${photoId}/original.${type.ext}`;
  const thumbnailKey = `work-orders/${order.id}/photos/${photoId}/thumbnail.webp`;
  const metadata = await sharp(input.bytes).metadata();
  const thumbnail = await sharp(input.bytes)
    .rotate()
    .resize({
      width: 480,
      height: 360,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78 })
    .toBuffer();
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  try {
    await storage.put(key, input.bytes, type.mime);
    await storage.put(thumbnailKey, thumbnail, "image/webp");
    return await db.$transaction(async (tx) => {
      const photo = await tx.inspectionPhoto.create({
      data: {
        id: photoId,
        workOrderId: order.id,
        checklistItemId: input.checklistItemId || null,
        workOrderItemId: input.workOrderItemId || null,
        category: input.category,
        region: input.region,
        damageType: input.damageType,
        description: input.description?.trim() || null,
        objectKey: key,
        thumbnailKey,
        size: input.bytes.length,
        mimeType: type.mime,
        originalName,
        width: metadata.width,
        height: metadata.height,
        checksum,
        capturedAt: input.capturedAt,
        uploadedById: actorId,
      },
    });
      await invalidateDocuments(tx, order.id);
      await audit(tx, actorId, order.id, "PHOTO_ADDED", { photoId: photo.id });
      return photo;
    });
  } catch (error) {
    await Promise.allSettled([storage.delete?.(key), storage.delete?.(thumbnailKey)]);
    throw error;
  }
}

export async function removePhoto(
  photoId: string,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return db.$transaction(async (tx) => {
    const photo = await tx.inspectionPhoto.findUniqueOrThrow({
      where: { id: photoId },
      include: { workOrder: true },
    });
    const protectedEvidence =
      (photo.category === PhotoCategory.GENERAL_ENTRY ||
        photo.category === PhotoCategory.DAMAGE) &&
      lockedStatuses.has(photo.workOrder.status);
    if (protectedEvidence && (actor.role !== Role.ADMIN || !reason?.trim()))
      throw new DomainError(
        "Esta evidência exige administrador e motivo para remoção.",
      );
    const updated = await tx.inspectionPhoto.update({
      where: { id: photo.id },
      data: { deletedAt: new Date() },
    });
    await invalidateDocuments(tx, photo.workOrderId);
    await audit(tx, actor.id, photo.workOrderId, "PHOTO_REMOVED", {
      photoId,
      reason: reason ?? null,
    });
    return updated;
  });
}

export async function updatePhotoDescription(
  photoId: string,
  description: string,
  actor: { id: string; role: Role },
  reason?: string,
) {
  return db.$transaction(async (tx) => {
    const photo = await tx.inspectionPhoto.findUniqueOrThrow({
      where: { id: photoId },
      include: { workOrder: true },
    });
    const protectedEvidence =
      (photo.category === PhotoCategory.GENERAL_ENTRY ||
        photo.category === PhotoCategory.DAMAGE) &&
      lockedStatuses.has(photo.workOrder.status);
    if (protectedEvidence && (actor.role !== Role.ADMIN || !reason?.trim()))
      throw new DomainError(
        "Esta evidência exige administrador e motivo para alteração.",
      );
    const updated = await tx.inspectionPhoto.update({
      where: { id: photo.id },
      data: { description: description.trim() || null },
    });
    await invalidateDocuments(tx, photo.workOrderId);
    await audit(tx, actor.id, photo.workOrderId, "PHOTO_DESCRIPTION_UPDATED", {
      photoId,
      reason: reason ?? null,
    });
    return updated;
  });
}

export async function saveSignature(
  input: {
    workOrderId: string;
    type: SignatureType;
    signerName: string;
    notes?: string;
    bytes: Uint8Array;
  },
  actorId: string,
  storage: PrivateStorage = privateStorage,
) {
  const detected = await validateImage(input.bytes, 2 * 1024 * 1024);
  await db.workOrder.findUniqueOrThrow({ where: { id: input.workOrderId } });
  const previous = await db.signature.findUnique({
    where: {
      workOrderId_type: { workOrderId: input.workOrderId, type: input.type },
    },
  });
  const key = `work-orders/${input.workOrderId}/signatures/${input.type}-${randomUUID()}.${detected.ext}`;
  try {
    await storage.put(key, input.bytes, detected.mime);
    const signature = await db.$transaction(async (tx) => {
      const saved = await tx.signature.upsert({
      where: {
        workOrderId_type: { workOrderId: input.workOrderId, type: input.type },
      },
      create: {
        workOrderId: input.workOrderId,
        type: input.type,
        signerName: input.signerName,
        notes: input.notes,
        objectKey: key,
        mimeType: detected.mime,
        size: input.bytes.length,
        collectedById: actorId,
      },
      update: {
        signerName: input.signerName,
        notes: input.notes,
        objectKey: key,
        mimeType: detected.mime,
        size: input.bytes.length,
        collectedById: actorId,
      },
    });
      await invalidateDocuments(tx, input.workOrderId);
      await audit(tx, actorId, input.workOrderId, "SIGNATURE_COLLECTED", {
        signatureId: saved.id,
        type: input.type,
      });
      return saved;
    });
    if (previous?.objectKey && previous.objectKey !== key)
      await storage.delete?.(previous.objectKey).catch(() => undefined);
    return signature;
  } catch (error) {
    await storage.delete?.(key).catch(() => undefined);
    throw error;
  }
}

async function audit(
  tx: Prisma.TransactionClient,
  userId: string,
  entityId: string,
  action: string,
  changes: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: { userId, entity: "WorkOrder", entityId, action, changes },
  });
}
async function invalidateDocuments(
  tx: Prisma.TransactionClient,
  workOrderId: string,
) {
  await tx.generatedDocument.updateMany({
    where: { workOrderId, status: "CURRENT" },
    data: { status: "OUTDATED" },
  });
}
