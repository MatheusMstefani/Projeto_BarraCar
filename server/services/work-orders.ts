import { AppointmentOrigin, AppointmentStatus, EntryType, FinancialStatus, PaymentStatus, Prisma, WorkOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type WorkOrderInput = { customerId: string; vehicleId: string; scheduledAt?: Date | null; expectedDeliveryAt?: Date | null; status: WorkOrderStatus; discount?: number; notes?: string; items: { serviceId: string; employeeId?: string | null; quantity: number; unitPrice: number }[] };

export async function saveWorkOrder(input: WorkOrderInput, actorId?: string, id?: string) {
  return db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: input.vehicleId } });
    if (vehicle.customerId !== input.customerId) throw new Error("O veículo não pertence ao cliente selecionado.");
    const total = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - (input.discount ?? 0);
    if (total < 0) throw new Error("O desconto não pode superar os serviços.");
    const data = { customerId: input.customerId, vehicleId: input.vehicleId, scheduledAt: input.scheduledAt, expectedDeliveryAt: input.expectedDeliveryAt, status: input.status, discount: input.discount ?? 0, total, notes: input.notes };
    const order = id
      ? await tx.workOrder.update({ where: { id }, data: { ...data, items: { deleteMany: {}, create: input.items } } })
      : await tx.workOrder.create({ data: { ...data, items: { create: input.items } } });
    await syncAppointment(tx, order);
    await tx.auditLog.create({ data: { userId: actorId, entity: "WorkOrder", entityId: order.id, action: id ? "UPDATE" : "CREATE" } });
    return order;
  });
}

async function syncAppointment(tx: Prisma.TransactionClient, order: { id: string; customerId: string; vehicleId: string; scheduledAt: Date | null; expectedDeliveryAt: Date | null; status: WorkOrderStatus }) {
  if (!order.scheduledAt) return;
  const status = order.status === WorkOrderStatus.CANCELED ? AppointmentStatus.CANCELED : AppointmentStatus.CONFIRMED;
  await tx.appointment.upsert({ where: { workOrderId: order.id }, create: { workOrderId: order.id, customerId: order.customerId, vehicleId: order.vehicleId, startsAt: order.scheduledAt, endsAt: order.expectedDeliveryAt ?? new Date(order.scheduledAt.getTime() + 60 * 60 * 1000), origin: AppointmentOrigin.WORK_ORDER, status }, update: { startsAt: order.scheduledAt, endsAt: order.expectedDeliveryAt ?? new Date(order.scheduledAt.getTime() + 60 * 60 * 1000), status } });
}

export async function markWorkOrderPaid(id: string, actorId?: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.workOrder.update({ where: { id }, data: { paymentStatus: PaymentStatus.PAID }, include: { financialEntry: true } });
    const entry = await tx.financialEntry.upsert({ where: { workOrderId: id }, create: { workOrderId: id, description: `Pagamento da OS #${order.number}`, type: EntryType.INCOME, category: "Pagamento de serviço", amount: order.total, competenceDate: new Date(), paidAt: new Date(), paymentMethod: order.paymentMethod, status: FinancialStatus.PAID }, update: { amount: order.total, paidAt: new Date(), paymentMethod: order.paymentMethod, status: FinancialStatus.PAID } });
    await tx.auditLog.create({ data: { userId: actorId, entity: "WorkOrder", entityId: id, action: "PAYMENT_PAID" } });
    return { order, entry };
  });
}
