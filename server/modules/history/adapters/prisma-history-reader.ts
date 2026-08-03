import {
  AppointmentStatus,
  EntryType,
  FinancialStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ServiceCategory,
  WorkOrderStatus,
} from "@prisma/client";
import { getAppTimeZone } from "@/lib/date-time";
import { db } from "@/lib/db";
import {
  civilRange,
  instantRange,
  resolveHistoryPeriod,
  type HistoryPeriod,
} from "@/lib/history-period";
import type {
  HistoryFilters,
  HistoryQuery,
} from "@/server/modules/history/application/contracts";

const completedStatuses: WorkOrderStatus[] = [
  WorkOrderStatus.FINISHED,
  WorkOrderStatus.AWAITING_PICKUP,
  WorkOrderStatus.DELIVERED,
];

function enumValue<T extends string>(values: readonly T[], value?: string) {
  return value && values.includes(value as T) ? (value as T) : undefined;
}

function orderNumberFromSearch(value: string | undefined) {
  if (!value || !/^#?\d+$/.test(value)) return undefined;
  const number = Number(value.replace("#", ""));
  return Number.isSafeInteger(number) && number >= 0 && number <= 2_147_483_647
    ? number
    : undefined;
}

function orderWhere(period: HistoryPeriod, filters: HistoryFilters): Prisma.WorkOrderWhereInput {
  const q = filters.q?.trim();
  const numericOrder = orderNumberFromSearch(q);
  const status = enumValue(Object.values(WorkOrderStatus), filters.status);
  const paymentStatus = enumValue(Object.values(PaymentStatus), filters.payment);
  const paymentMethod = enumValue(Object.values(PaymentMethod), filters.paymentMethod);
  const category = enumValue(Object.values(ServiceCategory), filters.category);
  return {
    entryAt: instantRange(period),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(filters.employeeId || filters.serviceId || category
      ? {
          items: {
            some: {
              ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
              ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
              ...(category ? { service: { category } } : {}),
            },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            ...(numericOrder ? [{ number: numericOrder }] : []),
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q } } },
            { customer: { taxId: { contains: q } } },
            { vehicle: { plate: { contains: q.replace(/[^a-zA-Z0-9]/g, ""), mode: "insensitive" } } },
            { vehicle: { model: { contains: q, mode: "insensitive" } } },
            { items: { some: { employee: { name: { contains: q, mode: "insensitive" } } } } },
            { items: { some: { service: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
}

function financialWhere(period: HistoryPeriod, filters: HistoryFilters): Prisma.FinancialEntryWhereInput {
  const type = enumValue(Object.values(EntryType), filters.financialType);
  const status = enumValue(Object.values(FinancialStatus), filters.financialStatus);
  const paymentMethod = enumValue(Object.values(PaymentMethod), filters.paymentMethod);
  const q = filters.q?.trim();
  const numericOrder = orderNumberFromSearch(q);
  const workOrderStatus = enumValue(Object.values(WorkOrderStatus), filters.status);
  const workOrderPayment = enumValue(Object.values(PaymentStatus), filters.payment);
  const category = enumValue(Object.values(ServiceCategory), filters.category);
  const hasWorkOrderFilter = Boolean(
    workOrderStatus ||
      workOrderPayment ||
      filters.employeeId ||
      filters.serviceId ||
      category,
  );
  return {
    competenceDate: civilRange(period),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(filters.origin === "manual"
      ? { workOrderId: null }
      : filters.origin === "order"
        ? { workOrderId: { not: null } }
        : {}),
    ...(hasWorkOrderFilter
      ? {
          workOrder: {
            ...(workOrderStatus ? { status: workOrderStatus } : {}),
            ...(workOrderPayment ? { paymentStatus: workOrderPayment } : {}),
            ...(filters.employeeId || filters.serviceId || category
              ? {
                  items: {
                    some: {
                      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
                      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
                      ...(category ? { service: { category } } : {}),
                    },
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            ...(numericOrder ? [{ workOrder: { number: numericOrder } }] : []),
            { workOrder: { customer: { name: { contains: q, mode: "insensitive" } } } },
            { workOrder: { customer: { phone: { contains: q } } } },
            { workOrder: { customer: { taxId: { contains: q } } } },
            { workOrder: { vehicle: { plate: { contains: q.replace(/[^a-zA-Z0-9]/g, ""), mode: "insensitive" } } } },
            { workOrder: { vehicle: { model: { contains: q, mode: "insensitive" } } } },
            { workOrder: { items: { some: { employee: { name: { contains: q, mode: "insensitive" } } } } } },
            { workOrder: { items: { some: { service: { name: { contains: q, mode: "insensitive" } } } } } },
          ],
        }
      : {}),
  };
}

function localMonth(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone }).format(date),
  ) - 1;
}

type MetricOrder = {
  id: string;
  customerId: string;
  vehicleId: string;
  status: WorkOrderStatus;
  total: Prisma.Decimal;
  items: { quantity: number }[];
};

type MetricFinance = {
  type: EntryType;
  status: FinancialStatus;
  amount: Prisma.Decimal;
};

function sumFinancialEntries(
  entries: MetricFinance[],
  type: EntryType,
  statuses: FinancialStatus[],
) {
  const acceptedStatuses = new Set(statuses);
  return entries.reduce(
    (total, entry) =>
      entry.type === type && acceptedStatuses.has(entry.status)
        ? total.plus(entry.amount)
        : total,
    new Prisma.Decimal(0),
  );
}

function summarizePeriod(orders: MetricOrder[], finances: MetricFinance[]) {
  const validOrders = orders.filter(
    (order) => order.status !== WorkOrderStatus.CANCELED,
  );
  const completedOrders = orders.filter((order) =>
    completedStatuses.includes(order.status),
  );
  const income = sumFinancialEntries(
    finances,
    EntryType.INCOME,
    [FinancialStatus.PAID],
  );
  const expense = sumFinancialEntries(
    finances,
    EntryType.EXPENSE,
    [FinancialStatus.PAID],
  );
  const pendingStatuses = [FinancialStatus.PENDING, FinancialStatus.OVERDUE];
  const receivable = sumFinancialEntries(
    finances,
    EntryType.INCOME,
    pendingStatuses,
  );
  const payable = sumFinancialEntries(
    finances,
    EntryType.EXPENSE,
    pendingStatuses,
  );
  const orderTotal = validOrders.reduce(
    (total, order) => total.plus(order.total),
    new Prisma.Decimal(0),
  );

  return {
    orders: orders.length,
    completedOrders: completedOrders.length,
    canceledOrders: orders.length - validOrders.length,
    services: completedOrders.reduce(
      (total, order) =>
        total + order.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    ),
    customers: new Set(validOrders.map((order) => order.customerId)).size,
    vehicles: new Set(validOrders.map((order) => order.vehicleId)).size,
    income: Number(income.toString()),
    expense: Number(expense.toString()),
    balance: Number(income.minus(expense).toString()),
    receivable: Number(receivable.toString()),
    payable: Number(payable.toString()),
    ticketAverage: validOrders.length
      ? Number(orderTotal.dividedBy(validOrders.length).toString())
      : 0,
  };
}

export async function getHistoryDataFromPrisma({
  period,
  filters = {},
  page = 1,
  pageSize = 20,
  unpaginated = false,
  timeZone = getAppTimeZone(),
}: HistoryQuery) {
  const normalizedPageSize = [20, 50, 100].includes(pageSize) ? pageSize : 20;
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const filteredOrderWhere = orderWhere(period, filters);
  const filteredFinanceWhere = financialWhere(period, filters);

  const [
    allOrders,
    totalOrders,
    orders,
    finances,
    totalFinances,
    allFinances,
    appointments,
    appointmentGroups,
    newCustomers,
    newVehicles,
    photos,
    documents,
    signatures,
    employees,
    services,
  ] = await Promise.all([
    db.workOrder.findMany({
      where: filteredOrderWhere,
      select: {
        id: true,
        customerId: true,
        vehicleId: true,
        status: true,
        total: true,
        entryAt: true,
        customer: { select: { name: true } },
        vehicle: { select: { plate: true, model: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            employeeId: true,
            serviceId: true,
            service: { select: { name: true, category: true } },
            employee: { select: { name: true, active: true } },
          },
        },
      },
    }),
    db.workOrder.count({ where: filteredOrderWhere }),
    db.workOrder.findMany({
      where: filteredOrderWhere,
      include: {
        customer: true,
        vehicle: true,
        items: { include: { service: true, employee: true } },
      },
      orderBy: { entryAt: "desc" },
      skip: unpaginated ? undefined : (normalizedPage - 1) * normalizedPageSize,
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.financialEntry.findMany({
      where: filteredFinanceWhere,
      include: { workOrder: true },
      orderBy: { competenceDate: "desc" },
      skip: unpaginated ? undefined : (normalizedPage - 1) * normalizedPageSize,
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.financialEntry.count({ where: filteredFinanceWhere }),
    db.financialEntry.findMany({
      where: filteredFinanceWhere,
      select: { type: true, status: true, amount: true },
    }),
    db.appointment.findMany({
      where: { startsAt: instantRange(period) },
      include: {
        customer: true,
        vehicle: true,
        employee: true,
        workOrder: { include: { items: { include: { service: true } } } },
      },
      orderBy: { startsAt: "desc" },
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.appointment.groupBy({
      by: ["status"],
      where: { startsAt: instantRange(period) },
      _count: true,
    }),
    db.customer.count({ where: { createdAt: instantRange(period) } }),
    db.vehicle.count({ where: { createdAt: instantRange(period) } }),
    db.inspectionPhoto.findMany({
      where: { createdAt: instantRange(period), deletedAt: null },
      include: { workOrder: { include: { customer: true, vehicle: true } }, uploadedBy: true },
      orderBy: { createdAt: "desc" },
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.generatedDocument.findMany({
      where: { createdAt: instantRange(period) },
      include: { workOrder: { include: { customer: true, vehicle: true } }, generatedBy: true },
      orderBy: { createdAt: "desc" },
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.signature.findMany({
      where: { createdAt: instantRange(period) },
      include: { workOrder: { include: { customer: true, vehicle: true } }, collectedBy: true },
      orderBy: { createdAt: "desc" },
      take: unpaginated ? undefined : normalizedPageSize,
    }),
    db.employee.findMany({ orderBy: { name: "asc" } }),
    db.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  const validOrders = allOrders.filter((order) => order.status !== WorkOrderStatus.CANCELED);
  const selectedMetrics = summarizePeriod(allOrders, allFinances);

  const serviceMap = new Map<string, { name: string; category: ServiceCategory; quantity: number; value: Prisma.Decimal; orders: Set<string> }>();
  const employeeMap = new Map<string, { name: string; active: boolean; quantity: number; value: Prisma.Decimal; orders: Set<string>; customers: Set<string>; vehicles: Set<string> }>();
  const customerMap = new Map<string, { name: string; orders: number; value: Prisma.Decimal; vehicles: Set<string> }>();
  const vehicleMap = new Map<string, { label: string; orders: number; value: Prisma.Decimal }>();
  for (const order of validOrders) {
    const customer = customerMap.get(order.customerId) ?? { name: order.customer.name, orders: 0, value: new Prisma.Decimal(0), vehicles: new Set<string>() };
    customer.orders += 1;
    customer.value = customer.value.plus(order.total);
    customer.vehicles.add(order.vehicleId);
    customerMap.set(order.customerId, customer);
    const vehicle = vehicleMap.get(order.vehicleId) ?? { label: `${order.vehicle.plate} · ${order.vehicle.model}`, orders: 0, value: new Prisma.Decimal(0) };
    vehicle.orders += 1;
    vehicle.value = vehicle.value.plus(order.total);
    vehicleMap.set(order.vehicleId, vehicle);
    for (const item of order.items) {
      const itemValue = item.unitPrice.times(item.quantity);
      const service = serviceMap.get(item.serviceId) ?? { name: item.service.name, category: item.service.category, quantity: 0, value: new Prisma.Decimal(0), orders: new Set<string>() };
      service.quantity += item.quantity;
      service.value = service.value.plus(itemValue);
      service.orders.add(order.id);
      serviceMap.set(item.serviceId, service);
      if (item.employeeId && item.employee) {
        const employee = employeeMap.get(item.employeeId) ?? { name: item.employee.name, active: item.employee.active, quantity: 0, value: new Prisma.Decimal(0), orders: new Set<string>(), customers: new Set<string>(), vehicles: new Set<string>() };
        employee.quantity += item.quantity;
        employee.value = employee.value.plus(itemValue);
        employee.orders.add(order.id);
        employee.customers.add(order.customerId);
        employee.vehicles.add(order.vehicleId);
        employeeMap.set(item.employeeId, employee);
      }
    }
  }

  const selectedYear = period.year;
  const annualPeriod = resolveHistoryPeriod(
    { mode: "year", year: String(selectedYear) },
    undefined,
    timeZone,
  );
  const [annualOrders, annualFinances] = await Promise.all([
    db.workOrder.findMany({
      where: orderWhere(annualPeriod, filters),
      select: {
        id: true,
        entryAt: true,
        customerId: true,
        vehicleId: true,
        status: true,
        total: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            service: { select: { category: true } },
          },
        },
      },
    }),
    db.financialEntry.findMany({
      where: financialWhere(annualPeriod, filters),
      select: { competenceDate: true, type: true, status: true, amount: true },
    }),
  ]);
  const annualOrderBuckets = Array.from(
    { length: 12 },
    () => [] as typeof annualOrders,
  );
  const annualFinanceBuckets = Array.from(
    { length: 12 },
    () => [] as typeof annualFinances,
  );
  for (const order of annualOrders) {
    annualOrderBuckets[localMonth(order.entryAt, timeZone)].push(order);
  }
  for (const entry of annualFinances) {
    annualFinanceBuckets[entry.competenceDate.getUTCMonth()].push(entry);
  }
  const annual = annualOrderBuckets.map((ordersInMonth, index) => {
    const metrics = summarizePeriod(ordersInMonth, annualFinanceBuckets[index]);
    return {
      month: index + 1,
      orders: metrics.orders,
      services: metrics.services,
      income: metrics.income,
      expense: metrics.expense,
      balance: metrics.balance,
      customers: metrics.customers,
      vehicles: metrics.vehicles,
    };
  });
  const annualCategoryRevenue = Object.values(ServiceCategory).map(
    (category) => {
      const value = annualOrders
        .filter((order) => order.status !== WorkOrderStatus.CANCELED)
        .flatMap((order) => order.items)
        .filter((item) => item.service.category === category)
        .reduce(
          (total, item) =>
            total.plus(item.unitPrice.times(item.quantity)),
          new Prisma.Decimal(0),
        );
      return { category, value: Number(value.toString()) };
    },
  );

  return {
    period,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalOrders,
    totalFinances,
    orders,
    finances,
    appointments,
    appointmentGroups,
    photos,
    documents,
    signatures,
    employees,
    services,
    summary: {
      ...selectedMetrics,
      appointments: appointmentGroups.reduce((sum, item) => sum + item._count, 0),
      canceledAppointments: appointmentGroups.find((item) => item.status === AppointmentStatus.CANCELED)?._count ?? 0,
      noShows: appointmentGroups.find((item) => item.status === AppointmentStatus.NO_SHOW)?._count ?? 0,
      quotes: 0,
      approvedQuotes: 0,
      convertedQuotes: 0,
      newCustomers,
      newVehicles,
    },
    serviceRanking: [...serviceMap.entries()].map(([id, value]) => ({ id, ...value, value: Number(value.value.toString()), orders: value.orders.size })).sort((a, b) => b.value - a.value),
    employeeRanking: [...employeeMap.entries()].map(([id, value]) => ({ id, ...value, value: Number(value.value.toString()), orders: value.orders.size, customers: value.customers.size, vehicles: value.vehicles.size })).sort((a, b) => b.value - a.value),
    customerRanking: [...customerMap.entries()].map(([id, value]) => ({ id, ...value, value: Number(value.value.toString()), vehicles: value.vehicles.size })).sort((a, b) => b.value - a.value),
    vehicleRanking: [...vehicleMap.entries()].map(([id, value]) => ({ id, ...value, value: Number(value.value.toString()) })).sort((a, b) => b.value - a.value),
    annual,
    annualCategoryRevenue,
  };
}

export const HISTORY_COMPLETED_STATUSES = completedStatuses;

export const prismaHistoryReader = {
  read: getHistoryDataFromPrisma,
};
