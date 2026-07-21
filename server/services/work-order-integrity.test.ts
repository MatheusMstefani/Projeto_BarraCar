import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PhotoCategory, Role, ServiceCategory, VehicleRegion, WorkOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { markWorkOrderPaid, saveWorkOrder } from "./work-orders";

const marker = `INTEGRITY-${Date.now()}`;
let actorId = "";
let customerId = "";
let vehicleId = "";
let serviceId = "";
let orderId = "";

beforeAll(async () => {
  actorId = (await db.user.findFirstOrThrow({ where: { role: Role.ADMIN } })).id;
  const customer = await db.customer.create({
    data: { name: marker, phone: "11999999999", whatsapp: "11999999999", city: "São Paulo" },
  });
  customerId = customer.id;
  vehicleId = (
    await db.vehicle.create({
      data: {
        customerId,
        brand: "Teste",
        model: "Integridade",
        color: "Preto",
        plate: `I${Date.now().toString().slice(-6)}`,
      },
    })
  ).id;
  serviceId = (
    await db.service.create({
      data: {
        name: marker,
        category: ServiceCategory.OTHER,
        defaultPrice: 0.1,
        durationMinutes: 30,
      },
    })
  ).id;
});

afterAll(async () => {
  if (orderId) {
    await db.auditLog.deleteMany({ where: { entityId: orderId } });
    await db.financialEntry.deleteMany({ where: { workOrderId: orderId } });
    await db.appointment.deleteMany({ where: { workOrderId: orderId } });
    await db.inspectionPhoto.deleteMany({ where: { workOrderId: orderId } });
    await db.workOrderItem.deleteMany({ where: { workOrderId: orderId } });
    await db.workOrder.deleteMany({ where: { id: orderId } });
  }
  await db.service.deleteMany({ where: { id: serviceId } });
  await db.vehicle.deleteMany({ where: { id: vehicleId } });
  await db.customer.deleteMany({ where: { id: customerId } });
  await db.$disconnect();
});

describe("integridade da edição da Ordem de Serviço", () => {
  it("preserva item, metadados e vínculo da foto e calcula dinheiro em centavos", async () => {
    const order = await saveWorkOrder(
      {
        customerId,
        vehicleId,
        status: WorkOrderStatus.DRAFT,
        discount: 0.1,
        items: [{ serviceId, quantity: 3, unitPrice: 0.1 }],
      },
      actorId,
    );
    orderId = order.id;
    expect(order.total.toString()).toBe("0.2");
    const item = await db.workOrderItem.findFirstOrThrow({ where: { workOrderId: orderId } });
    await db.workOrderItem.update({
      where: { id: item.id },
      data: { startedAt: new Date(), notes: "Metadado preservado" },
    });
    const photo = await db.inspectionPhoto.create({
      data: {
        workOrderId: orderId,
        workOrderItemId: item.id,
        category: PhotoCategory.BEFORE_SERVICE,
        region: VehicleRegion.FRONT,
        objectKey: `${marker}/original.png`,
        size: 10,
        mimeType: "image/png",
        originalName: "teste.png",
        uploadedById: actorId,
      },
    });

    const updated = await saveWorkOrder(
      {
        customerId,
        vehicleId,
        status: WorkOrderStatus.DRAFT,
        items: [{ serviceId, quantity: 3, unitPrice: 0.1 }],
      },
      actorId,
      orderId,
    );
    expect(updated.total.toString()).toBe("0.3");
    const preserved = await db.workOrderItem.findFirstOrThrow({ where: { workOrderId: orderId } });
    expect(preserved.id).toBe(item.id);
    expect(preserved.notes).toBe("Metadado preservado");
    expect((await db.inspectionPhoto.findUniqueOrThrow({ where: { id: photo.id } })).workOrderItemId).toBe(item.id);
  });

  it("impede marcar uma OS cancelada como paga", async () => {
    await db.workOrder.update({ where: { id: orderId }, data: { status: WorkOrderStatus.CANCELED } });
    await expect(markWorkOrderPaid(orderId, actorId)).rejects.toThrow("cancelada");
  });
});
