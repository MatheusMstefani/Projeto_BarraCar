import { fileTypeFromBuffer } from "file-type";
import { PhotoCategory, Prisma, Role, SignatureType, VehicleRegion, WorkOrderStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { privateStorage, type PrivateStorage } from "@/lib/storage";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const lockedStatuses = new Set<WorkOrderStatus>([WorkOrderStatus.FINISHED, WorkOrderStatus.AWAITING_PICKUP, WorkOrderStatus.DELIVERED]);

export async function validateImage(bytes: Uint8Array, maxBytes = Number(process.env.MAX_IMAGE_SIZE_MB ?? 10) * 1024 * 1024) {
  if (!bytes.length || bytes.length > maxBytes) throw new Error("A imagem excede o tamanho máximo permitido.");
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !imageTypes.has(detected.mime)) throw new Error("Formato inválido. Envie JPG, PNG ou WEBP.");
  return detected;
}

export async function addPhoto(input: { workOrderId: string; category: PhotoCategory; region: VehicleRegion; description?: string; checklistItemId?: string; originalName: string; bytes: Uint8Array }, actorId: string, storage: PrivateStorage = privateStorage) {
  const type = await validateImage(input.bytes);
  const order = await db.workOrder.findUniqueOrThrow({ where: { id: input.workOrderId } });
  const key = `work-orders/${order.id}/photos/${randomUUID()}.${type.ext}`;
  await storage.put(key, input.bytes, type.mime);
  return db.$transaction(async (tx) => {
    if (input.checklistItemId) await tx.workOrderChecklistItem.findFirstOrThrow({ where: { id: input.checklistItemId, workOrderId: order.id } });
    const photo = await tx.inspectionPhoto.create({ data: { workOrderId: order.id, checklistItemId: input.checklistItemId || null, category: input.category, region: input.region, description: input.description?.trim() || null, objectKey: key, size: input.bytes.length, mimeType: type.mime, originalName: input.originalName, uploadedById: actorId } });
    await audit(tx, actorId, order.id, "PHOTO_ADDED", { photoId: photo.id });
    return photo;
  });
}

export async function removePhoto(photoId: string, actor: { id: string; role: Role }, reason?: string) {
  return db.$transaction(async (tx) => {
    const photo = await tx.inspectionPhoto.findUniqueOrThrow({ where: { id: photoId }, include: { workOrder: true } });
    const protectedEvidence = (photo.category === PhotoCategory.GENERAL_ENTRY || photo.category === PhotoCategory.DAMAGE) && lockedStatuses.has(photo.workOrder.status);
    if (protectedEvidence && (actor.role !== Role.ADMIN || !reason?.trim())) throw new Error("Esta evidência exige administrador e motivo para remoção.");
    const updated = await tx.inspectionPhoto.update({ where: { id: photo.id }, data: { deletedAt: new Date() } });
    await audit(tx, actor.id, photo.workOrderId, "PHOTO_REMOVED", { photoId, reason: reason ?? null });
    return updated;
  });
}

export async function updatePhotoDescription(photoId: string, description: string, actor: { id: string; role: Role }, reason?: string) {
  return db.$transaction(async (tx) => {
    const photo = await tx.inspectionPhoto.findUniqueOrThrow({ where: { id: photoId }, include: { workOrder: true } });
    const protectedEvidence = (photo.category === PhotoCategory.GENERAL_ENTRY || photo.category === PhotoCategory.DAMAGE) && lockedStatuses.has(photo.workOrder.status);
    if (protectedEvidence && (actor.role !== Role.ADMIN || !reason?.trim())) throw new Error("Esta evidência exige administrador e motivo para alteração.");
    const updated = await tx.inspectionPhoto.update({ where: { id: photo.id }, data: { description: description.trim() || null } });
    await audit(tx, actor.id, photo.workOrderId, "PHOTO_DESCRIPTION_UPDATED", { photoId, reason: reason ?? null });
    return updated;
  });
}

export async function saveSignature(input: { workOrderId: string; type: SignatureType; signerName: string; notes?: string; bytes: Uint8Array }, actorId: string, storage: PrivateStorage = privateStorage) {
  const detected = await validateImage(input.bytes, 2 * 1024 * 1024);
  await db.workOrder.findUniqueOrThrow({ where: { id: input.workOrderId } });
  const key = `work-orders/${input.workOrderId}/signatures/${input.type}-${randomUUID()}.${detected.ext}`;
  await storage.put(key, input.bytes, detected.mime);
  return db.$transaction(async (tx) => {
    const signature = await tx.signature.upsert({ where: { workOrderId_type: { workOrderId: input.workOrderId, type: input.type } }, create: { workOrderId: input.workOrderId, type: input.type, signerName: input.signerName, notes: input.notes, objectKey: key, mimeType: detected.mime, size: input.bytes.length, collectedById: actorId }, update: { signerName: input.signerName, notes: input.notes, objectKey: key, mimeType: detected.mime, size: input.bytes.length, collectedById: actorId } });
    await audit(tx, actorId, input.workOrderId, "SIGNATURE_COLLECTED", { signatureId: signature.id, type: input.type });
    return signature;
  });
}

async function audit(tx: Prisma.TransactionClient, userId: string, entityId: string, action: string, changes: Prisma.InputJsonValue) { await tx.auditLog.create({ data: { userId, entity: "WorkOrder", entityId, action, changes } }); }
