import {
  AppointmentOrigin,
  AppointmentStatus,
  EntryType,
  FinancialStatus,
  PaymentStatus,
  Prisma,
  WorkOrderStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getCivilDateInputValue, parseCivilDate } from "@/lib/date-time";

export type WorkOrderInput = {
  customerId: string;
  vehicleId: string;
  scheduledAt?: Date | null;
  expectedDeliveryAt?: Date | null;
  status: WorkOrderStatus;
  discount?: number;
  notes?: string;
  items: {
    id?: string;
    serviceId: string;
    employeeId?: string | null;
    quantity: number;
    unitPrice: number;
  }[];
};

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const decimalFromCents = (value: number) => new Prisma.Decimal(value).div(100);

export async function saveWorkOrder(input: WorkOrderInput, actorId?: string, id?: string) {
  return db.$transaction(async (tx) => {
    if (!input.customerId || !input.vehicleId || !input.items.length)
      throw new Error("Cliente, veículo e ao menos um serviço são obrigatórios.");
    if (input.items.some((item) => item.quantity <= 0 || item.unitPrice < 0 || !item.serviceId))
      throw new Error("Os itens da Ordem possuem valores inválidos.");

    const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: input.vehicleId } });
    if (vehicle.customerId !== input.customerId)
      throw new Error("O veículo não pertence ao cliente selecionado.");

    const normalizedItems = input.items.map((item) => ({
      ...item,
      unitPriceCents: cents(item.unitPrice),
    }));
    const totalCents = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    ) - cents(input.discount ?? 0);
    if (totalCents < 0) throw new Error("O desconto não pode superar os serviços.");

    const data = {
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      scheduledAt: input.scheduledAt,
      expectedDeliveryAt: input.expectedDeliveryAt,
      status: input.status,
      discount: decimalFromCents(cents(input.discount ?? 0)),
      total: decimalFromCents(totalCents),
      notes: input.notes,
    };

    let order;
    if (id) {
      await reconcileItems(tx, id, normalizedItems);
      order = await tx.workOrder.update({ where: { id }, data });
      await tx.generatedDocument.updateMany({
        where: { workOrderId: id, status: "CURRENT" },
        data: { status: "OUTDATED" },
      });
      await tx.financialEntry.updateMany({
        where: { workOrderId: id, status: FinancialStatus.PAID },
        data: { amount: decimalFromCents(totalCents) },
      });
    } else {
      order = await tx.workOrder.create({
        data: {
          ...data,
          items: {
            create: normalizedItems.map((item) => ({
              serviceId: item.serviceId,
              employeeId: item.employeeId,
              quantity: item.quantity,
              unitPrice: decimalFromCents(item.unitPriceCents),
            })),
          },
        },
      });
    }

    await syncAppointment(tx, order);
    await tx.auditLog.create({
      data: {
        userId: actorId,
        entity: "WorkOrder",
        entityId: order.id,
        action: id ? "UPDATE" : "CREATE",
      },
    });
    return order;
  });
}

async function reconcileItems(
  tx: Prisma.TransactionClient,
  workOrderId: string,
  incoming: Array<WorkOrderInput["items"][number] & { unitPriceCents: number }>,
) {
  const existing = await tx.workOrderItem.findMany({
    where: { workOrderId },
    orderBy: { id: "asc" },
  });
  const unused = new Set(existing.map((item) => item.id));

  for (const item of incoming) {
    const matched = item.id
      ? existing.find((candidate) => candidate.id === item.id)
      : existing.find(
          (candidate) => unused.has(candidate.id) && candidate.serviceId === item.serviceId,
        );
    if (item.id && !matched) throw new Error("Um item informado não pertence a esta Ordem de Serviço.");

    const data = {
      serviceId: item.serviceId,
      employeeId: item.employeeId,
      quantity: item.quantity,
      unitPrice: decimalFromCents(item.unitPriceCents),
    };
    if (matched) {
      unused.delete(matched.id);
      await tx.workOrderItem.update({ where: { id: matched.id }, data });
    } else {
      await tx.workOrderItem.create({ data: { workOrderId, ...data } });
    }
  }

  if (unused.size) {
    await tx.workOrderItem.deleteMany({
      where: { workOrderId, id: { in: [...unused] } },
    });
  }
}

async function syncAppointment(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    customerId: string;
    vehicleId: string;
    scheduledAt: Date | null;
    expectedDeliveryAt: Date | null;
    status: WorkOrderStatus;
  },
) {
  if (!order.scheduledAt) {
    await tx.appointment.updateMany({
      where: { workOrderId: order.id, status: { not: AppointmentStatus.CANCELED } },
      data: { status: AppointmentStatus.CANCELED },
    });
    return;
  }
  const status =
    order.status === WorkOrderStatus.CANCELED
      ? AppointmentStatus.CANCELED
      : AppointmentStatus.CONFIRMED;
  await tx.appointment.upsert({
    where: { workOrderId: order.id },
    create: {
      workOrderId: order.id,
      customerId: order.customerId,
      vehicleId: order.vehicleId,
      startsAt: order.scheduledAt,
      endsAt:
        order.expectedDeliveryAt ?? new Date(order.scheduledAt.getTime() + 60 * 60 * 1000),
      origin: AppointmentOrigin.WORK_ORDER,
      status,
    },
    update: {
      startsAt: order.scheduledAt,
      endsAt:
        order.expectedDeliveryAt ?? new Date(order.scheduledAt.getTime() + 60 * 60 * 1000),
      status,
    },
  });
}

export async function markWorkOrderPaid(id: string, actorId?: string) {
  return db.$transaction(async (tx) => {
    const current = await tx.workOrder.findUniqueOrThrow({ where: { id } });
    if (current.status === WorkOrderStatus.CANCELED)
      throw new Error("Uma Ordem de Serviço cancelada não pode ser marcada como paga.");
    const order = await tx.workOrder.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.PAID },
      include: { financialEntry: true },
    });
    const entry = await tx.financialEntry.upsert({
      where: { workOrderId: id },
      create: {
        workOrderId: id,
        description: `Pagamento da OS #${order.number}`,
        type: EntryType.INCOME,
        category: "Pagamento de serviço",
        amount: order.total,
        competenceDate: parseCivilDate(getCivilDateInputValue()),
        paidAt: new Date(),
        paymentMethod: order.paymentMethod,
        status: FinancialStatus.PAID,
      },
      update: {
        amount: order.total,
        paidAt: new Date(),
        paymentMethod: order.paymentMethod,
        status: FinancialStatus.PAID,
      },
    });
    await tx.auditLog.create({
      data: { userId: actorId, entity: "WorkOrder", entityId: id, action: "PAYMENT_PAID" },
    });
    return { order, entry };
  });
}

export async function cancelWorkOrderPayment(id: string, actorId?: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.workOrder.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.CANCELED },
    });
    await tx.financialEntry.updateMany({
      where: { workOrderId: id },
      data: {
        status: FinancialStatus.CANCELED,
        notes: "Pagamento revertido; lançamento preservado para auditoria.",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        entity: "WorkOrder",
        entityId: id,
        action: "PAYMENT_CANCELED",
      },
    });
    return order;
  });
}
