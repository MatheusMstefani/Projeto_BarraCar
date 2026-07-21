import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ChecklistItemStatus,
  DamageType,
  PhotoCategory,
  Role,
  ServiceCategory,
  SignatureType,
  VehicleRegion,
  WorkOrderStatus,
} from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { PrivateStorage } from "@/lib/storage";
import { ensureWorkOrderChecklist, saveChecklistAnswer } from "./checklists";
import { addPhoto, removePhoto, saveSignature, validateImage } from "./media";
import { generateWorkOrderDocument } from "./documents";
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
import { GET as getPrivatePhoto } from "@/app/api/media/photos/[id]/route";

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);
const objects = new Map<string, Uint8Array>();
const storage: PrivateStorage = {
  async put(key, bytes) {
    objects.set(key, bytes);
  },
  async get(key) {
    const value = objects.get(key);
    if (!value) throw new Error("Arquivo ausente");
    return value;
  },
  async delete(key) {
    objects.delete(key);
  },
};
let userId = "",
  orderId = "",
  templateId = "",
  photoId = "";

beforeAll(async () => {
  const user = await db.user.findFirstOrThrow({ where: { role: Role.ADMIN } });
  userId = user.id;
  const customer = await db.customer.create({
    data: {
      name: "Cliente Teste Fase 2",
      phone: "11999999999",
      whatsapp: "11999999999",
      city: "São Paulo",
    },
  });
  const vehicle = await db.vehicle.create({
    data: {
      customerId: customer.id,
      brand: "Teste",
      model: "PDF",
      color: "Preto",
      plate: `TST${Date.now().toString().slice(-4)}`,
    },
  });
  const service = await db.service.create({
    data: {
      name: `Serviço teste ${Date.now()}`,
      category: ServiceCategory.OTHER,
      defaultPrice: 100,
      durationMinutes: 60,
    },
  });
  const order = await db.workOrder.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      total: 100,
      items: { create: { serviceId: service.id, quantity: 1, unitPrice: 100 } },
    },
  });
  orderId = order.id;
  const template = await db.checklistTemplate.create({
    data: {
      name: `Template teste ${Date.now()}`,
      items: {
        create: [
          { title: "Pintura", category: "Estado externo", displayOrder: 900 },
          { title: "Bancos", category: "Estado interno", displayOrder: 901 },
        ],
      },
    },
  });
  templateId = template.id;
});

afterAll(async () => {
  const order = await db.workOrder.findUnique({ where: { id: orderId } });
  if (order) {
    await db.auditLog.deleteMany({ where: { entityId: orderId } });
    await db.generatedDocument.deleteMany({ where: { workOrderId: orderId } });
    await db.signature.deleteMany({ where: { workOrderId: orderId } });
    await db.inspectionPhoto.deleteMany({ where: { workOrderId: orderId } });
    await db.workOrderChecklistItem.deleteMany({
      where: { workOrderId: orderId },
    });
    await db.workOrderItem.deleteMany({ where: { workOrderId: orderId } });
    await db.workOrder.delete({ where: { id: orderId } });
    await db.service.deleteMany({
      where: { name: { startsWith: "Serviço teste" } },
    });
    await db.vehicle.delete({ where: { id: order.vehicleId } });
    await db.customer.delete({ where: { id: order.customerId } });
  }
  await db.checklistTemplateItem.deleteMany({ where: { templateId } });
  await db.checklistTemplate.deleteMany({ where: { id: templateId } });
  await db.$disconnect();
});

describe("Fase 2", () => {
  it("salva parcialmente e não duplica o checklist ao reabrir", async () => {
    const first = await ensureWorkOrderChecklist(orderId);
    const second = await ensureWorkOrderChecklist(orderId);
    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(first.length);
    const answer = second[0];
    const saved = await saveChecklistAnswer(
      {
        workOrderId: orderId,
        answerId: answer.id,
        status: ChecklistItemStatus.DAMAGED,
        notes: "Risco existente",
      },
      userId,
    );
    expect(saved.status).toBe(ChecklistItemStatus.DAMAGED);
  });
  it("valida MIME real, checksum, miniatura e vínculo à OS", async () => {
    expect((await validateImage(png)).mime).toBe("image/png");
    await expect(validateImage(new Uint8Array([1, 2, 3]))).rejects.toThrow();
    await expect(validateImage(png, 1)).rejects.toThrow();
    const checklistItem = await db.workOrderChecklistItem.findFirstOrThrow({ where: { workOrderId: orderId } });
    const workOrderItem = await db.workOrderItem.findFirstOrThrow({ where: { workOrderId: orderId } });
    const storedBeforeInvalidLink = objects.size;
    await expect(addPhoto({ workOrderId: orderId, category: PhotoCategory.BEFORE_SERVICE, region: VehicleRegion.FRONT, workOrderItemId: "item-inexistente", originalName: "invalida.png", bytes: png }, userId, storage)).rejects.toThrow();
    expect(objects.size).toBe(storedBeforeInvalidLink);
    const photo = await addPhoto(
      {
        workOrderId: orderId,
        category: PhotoCategory.DAMAGE,
        region: VehicleRegion.LEFT_SIDE,
        damageType: DamageType.SCRATCH,
        checklistItemId: checklistItem.id,
        workOrderItemId: workOrderItem.id,
        description: "Avaria",
        originalName: "foto.jpg",
        bytes: png,
      },
      userId,
      storage,
    );
    photoId = photo.id;
    expect(photo.workOrderId).toBe(orderId);
    expect(photo.mimeType).toBe("image/png");
    expect(photo.checksum).toHaveLength(64);
    expect(photo.checklistItemId).toBe(checklistItem.id);
    expect(photo.workOrderItemId).toBe(workOrderItem.id);
    expect(photo.thumbnailKey && objects.has(photo.thumbnailKey)).toBe(true);
  });
  it("impede remoção silenciosa de evidência após finalização", async () => {
    await db.workOrder.update({
      where: { id: orderId },
      data: { status: WorkOrderStatus.FINISHED },
    });
    await expect(
      removePhoto(photoId, { id: userId, role: Role.EMPLOYEE }),
    ).rejects.toThrow();
    await expect(
      removePhoto(photoId, { id: userId, role: Role.ADMIN }),
    ).rejects.toThrow();
    await db.workOrder.update({
      where: { id: orderId },
      data: { status: WorkOrderStatus.DRAFT },
    });
  });
  it("salva assinatura privada", async () => {
    const signature = await saveSignature(
      {
        workOrderId: orderId,
        type: SignatureType.CUSTOMER_ENTRY,
        signerName: "Cliente Teste",
        bytes: png,
      },
      userId,
      storage,
    );
    expect(signature.workOrderId).toBe(orderId);
    expect(objects.has(signature.objectKey)).toBe(true);
  });
  it("gera PDF válido com cliente, veículo, checklist, foto e assinatura e mantém versões", async () => {
    const first = await generateWorkOrderDocument(orderId, userId, storage);
    const bytes = await storage.get(first.objectKey);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    const concurrent = await Promise.all([
      generateWorkOrderDocument(orderId, userId, storage),
      generateWorkOrderDocument(orderId, userId, storage),
    ]);
    expect(concurrent.map((document) => document.version).sort((a, b) => a - b)).toEqual([
      first.version + 1,
      first.version + 2,
    ]);
    expect(
      await db.generatedDocument.count({ where: { workOrderId: orderId } }),
    ).toBe(3);
    expect(objects.has(first.objectKey)).toBe(true);
  });
  it("nega foto sem autenticação", async () => {
    const response = await getPrivatePhoto(
      new NextRequest(`http://localhost/api/media/photos/${photoId}`),
      { params: Promise.resolve({ id: photoId }) },
    );
    expect(response.status).toBe(401);
  });
});
