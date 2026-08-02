import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  EntryType,
  FinancialStatus,
  ServiceCategory,
  WorkOrderStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { resolveHistoryPeriod } from "@/lib/history-period";
import { getHistoryData } from "./history";

const marker = `HISTORY-${Date.now()}`;
let customerId = "";
let vehicleId = "";
let employeeId = "";
let serviceId = "";
let vehiclePlate = "";

beforeAll(async () => {
  const customer = await db.customer.create({
    data: { name: marker, phone: "49999990000", whatsapp: "49999990000", city: "Lages" },
  });
  customerId = customer.id;
  vehiclePlate = `H${Date.now().toString().slice(-6)}`;
  vehicleId = (await db.vehicle.create({
    data: { customerId, brand: "Teste", model: "Histórico", color: "Azul", plate: vehiclePlate },
  })).id;
  employeeId = (await db.employee.create({
    data: { name: `${marker} Inativo`, phone: "49999990000", position: "Técnico", hiredAt: new Date("2025-01-01"), active: false },
  })).id;
  serviceId = (await db.service.create({
    data: { name: marker, category: ServiceCategory.INTERNAL, defaultPrice: 500, durationMinutes: 60 },
  })).id;

  for (const entryAt of ["2026-07-01T03:00:00.000Z", "2026-08-01T02:59:59.000Z", "2026-08-01T03:00:00.000Z"]) {
    await db.workOrder.create({
      data: {
        customerId,
        vehicleId,
        entryAt: new Date(entryAt),
        status: WorkOrderStatus.FINISHED,
        total: 120,
        items: { create: { serviceId, employeeId, quantity: 1, unitPrice: 120 } },
      },
    });
  }
  for (const [entryAt, quantity] of [
    ["2026-01-01T03:00:00.000Z", 2],
    ["2027-01-01T02:59:59.999Z", 3],
    ["2027-01-01T03:00:00.000Z", 4],
  ] as const) {
    await db.workOrder.create({
      data: {
        customerId,
        vehicleId,
        entryAt: new Date(entryAt),
        status: WorkOrderStatus.FINISHED,
        total: quantity * 10,
        items: { create: { serviceId, employeeId, quantity, unitPrice: 10 } },
      },
    });
  }
  await db.workOrder.create({
    data: {
      customerId,
      vehicleId,
      entryAt: new Date("2026-07-15T12:00:00.000Z"),
      status: WorkOrderStatus.CANCELED,
      total: 999,
      items: { create: { serviceId, employeeId, quantity: 5, unitPrice: 999 } },
    },
  });
  await db.workOrder.createMany({
    data: Array.from({ length: 21 }, (_, index) => ({
      customerId,
      vehicleId,
      entryAt: new Date(`2026-07-${String(index + 2).padStart(2, "0")}T15:00:00.000Z`),
      status: WorkOrderStatus.DRAFT,
      total: 0,
    })),
  });
  await db.financialEntry.createMany({
    data: [
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 200, competenceDate: new Date("2026-07-01T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 0.1, competenceDate: new Date("2026-07-02T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 0.2, competenceDate: new Date("2026-07-03T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.EXPENSE, category: "Teste", amount: 50, competenceDate: new Date("2026-07-31T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 999, competenceDate: new Date("2026-07-15T00:00:00Z"), status: FinancialStatus.CANCELED },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 300, competenceDate: new Date("2026-08-01T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 10, competenceDate: new Date("2026-01-01T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.EXPENSE, category: "Teste", amount: 5, competenceDate: new Date("2026-12-31T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
      { description: marker, type: EntryType.INCOME, category: "Teste", amount: 777, competenceDate: new Date("2027-01-01T00:00:00Z"), paidAt: new Date(), status: FinancialStatus.PAID },
    ],
  });
});

afterAll(async () => {
  const orders = await db.workOrder.findMany({ where: { customerId }, select: { id: true } });
  const orderIds = orders.map((item) => item.id);
  await db.auditLog.deleteMany({ where: { entityId: { in: orderIds } } });
  await db.financialEntry.deleteMany({ where: { OR: [{ description: marker }, { workOrderId: { in: orderIds } }] } });
  await db.appointment.deleteMany({ where: { workOrderId: { in: orderIds } } });
  await db.workOrderItem.deleteMany({ where: { workOrderId: { in: orderIds } } });
  await db.workOrder.deleteMany({ where: { id: { in: orderIds } } });
  await db.service.deleteMany({ where: { id: serviceId } });
  await db.employee.deleteMany({ where: { id: employeeId } });
  await db.vehicle.deleteMany({ where: { id: vehicleId } });
  await db.customer.deleteMany({ where: { id: customerId } });
});

describe("histórico geral", () => {
  it("separa julho e agosto, inclui os limites e exclui cancelados do saldo", async () => {
    const july = await getHistoryData({
      period: resolveHistoryPeriod({ mode: "month", year: "2026", month: "7" }),
      filters: { q: marker },
      pageSize: 20,
    });
    expect(july.summary.orders).toBe(24);
    expect(july.totalOrders).toBe(24);
    expect(july.orders).toHaveLength(20);
    expect(july.summary.income).toBe(200.3);
    expect(july.summary.expense).toBe(50);
    expect(july.summary.balance).toBe(150.3);
    expect(july.summary.canceledOrders).toBe(1);
    expect(july.summary.customers).toBe(1);
    expect(july.summary.vehicles).toBe(1);
    expect(july.summary.services).toBe(2);
    expect(july.serviceRanking[0]).toMatchObject({ quantity: 2, value: 240 });
    expect(july.employeeRanking[0]).toMatchObject({ active: false, quantity: 2 });
    expect(july.annual[6]).toMatchObject({
      orders: july.summary.orders,
      services: july.summary.services,
      income: july.summary.income,
      expense: july.summary.expense,
      balance: july.summary.balance,
      customers: july.summary.customers,
      vehicles: july.summary.vehicles,
    });

    const julyPageTwo = await getHistoryData({
      period: resolveHistoryPeriod({ mode: "month", year: "2026", month: "7" }),
      filters: { q: marker },
      page: 2,
      pageSize: 20,
    });
    expect(julyPageTwo.orders).toHaveLength(4);

    const august = await getHistoryData({
      period: resolveHistoryPeriod({ mode: "month", year: "2026", month: "8" }),
      filters: { q: marker },
    });
    expect(august.summary.orders).toBe(1);
    expect(august.summary.income).toBe(300);
  });

  it("mantém cada resumo mensal idêntico à linha anual, inclusive janeiro, dezembro e meses vazios", async () => {
    const annual = await getHistoryData({
      period: resolveHistoryPeriod({ mode: "year", year: "2026" }),
      filters: { q: marker },
    });

    for (let month = 1; month <= 12; month += 1) {
      const monthly = await getHistoryData({
        period: resolveHistoryPeriod({
          mode: "month",
          year: "2026",
          month: String(month),
        }),
        filters: { q: marker },
      });
      expect(annual.annual[month - 1]).toEqual({
        month,
        orders: monthly.summary.orders,
        services: monthly.summary.services,
        income: monthly.summary.income,
        expense: monthly.summary.expense,
        balance: monthly.summary.balance,
        customers: monthly.summary.customers,
        vehicles: monthly.summary.vehicles,
      });
    }

    expect(annual.annual[0]).toMatchObject({ orders: 1, services: 2, income: 10 });
    expect(annual.annual[8]).toMatchObject({ orders: 0, services: 0, income: 0 });
    expect(annual.annual[11]).toMatchObject({ orders: 1, services: 3, expense: 5 });
  });

  it("filtra por placa, funcionário, serviço e status sem alterar valores históricos", async () => {
    const result = await getHistoryData({
      period: resolveHistoryPeriod({ mode: "custom", from: "2026-07-31", to: "2026-08-01" }),
      filters: {
        q: marker,
        employeeId,
        serviceId,
        status: WorkOrderStatus.FINISHED,
      },
    });
    expect(result.totalOrders).toBe(2);
    expect(result.serviceRanking[0]?.value).toBe(240);
    expect(result.services.find((item) => item.id === serviceId)?.defaultPrice.toString()).toBe("500");
  });

  it("busca o financeiro pela OS relacionada e ignora números fora do limite", async () => {
    const order = await db.workOrder.findFirstOrThrow({
      where: { customerId, status: WorkOrderStatus.FINISHED },
      orderBy: { entryAt: "asc" },
    });
    const linkedEntry = await db.financialEntry.create({
      data: {
        description: "Lançamento relacionado",
        type: EntryType.INCOME,
        category: "Teste",
        amount: 25,
        competenceDate: new Date("2026-07-01T00:00:00Z"),
        paidAt: new Date(),
        status: FinancialStatus.PAID,
        workOrderId: order.id,
      },
    });

    try {
      const related = await getHistoryData({
        period: resolveHistoryPeriod({ mode: "month", year: "2026", month: "7" }),
        filters: { q: vehiclePlate },
      });
      expect(related.totalFinances).toBe(1);
      expect(related.finances[0]?.id).toBe(linkedEntry.id);

      const oversizedNumber = await getHistoryData({
        period: resolveHistoryPeriod({ mode: "month", year: "2026", month: "7" }),
        filters: { q: "999999999999999999999999999999" },
      });
      expect(oversizedNumber.totalOrders).toBe(0);
      expect(oversizedNumber.totalFinances).toBe(0);
    } finally {
      await db.financialEntry.delete({ where: { id: linkedEntry.id } });
    }
  });
});
