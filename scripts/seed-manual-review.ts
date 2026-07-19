import { EntryType, FinancialStatus, Role, ServiceCategory, WorkOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { markWorkOrderPaid, saveWorkOrder } from "@/server/services/work-orders";

const label = "TESTE MANUAL - REVISÃO";
async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: Role.ADMIN } });
  const customer = await db.customer.upsert({ where: { id: (await db.customer.findFirst({ where: { name: label } }))?.id ?? "new" }, update: {}, create: { name: label, phone: "(11) 99999-1000", whatsapp: "11999991000", city: "São Paulo", notes: "Dados criados para conferência manual." } });
  const vehicle = await db.vehicle.upsert({ where: { plate: "TST1A23" }, update: { customerId: customer.id }, create: { customerId: customer.id, brand: "Volkswagen", model: "T-Cross Teste", color: "Branco", plate: "TST1A23", year: 2024 } });
  async function employee(name: string, phone: string, active: boolean) { const found = await db.employee.findFirst({ where: { phone } }); return found ? db.employee.update({ where: { id: found.id }, data: { name, active } }) : db.employee.create({ data: { name, phone, position: "Técnico de estética", hiredAt: new Date("2025-01-10"), active } }); }
  const alan = await employee("Alan - TESTE ATIVO", "(11) 98888-1001", true); const eric = await employee("Eric - TESTE ATIVO", "(11) 98888-1002", true); await employee("Funcionário - TESTE INATIVO", "(11) 98888-1099", false);
  const cleaning = await db.service.upsert({ where: { name_category: { name: "Limpeza detalhada - TESTE", category: ServiceCategory.INTERNAL } }, update: { defaultPrice: 180, active: true }, create: { name: "Limpeza detalhada - TESTE", category: ServiceCategory.INTERNAL, defaultPrice: 180, durationMinutes: 120 } });
  const polish = await db.service.upsert({ where: { name_category: { name: "Polimento - TESTE", category: ServiceCategory.EXTERNAL } }, update: { defaultPrice: 350, active: true }, create: { name: "Polimento - TESTE", category: ServiceCategory.EXTERNAL, defaultPrice: 350, durationMinutes: 180 } });
  await db.service.upsert({ where: { name_category: { name: "Serviço - TESTE INATIVO", category: ServiceCategory.OTHER } }, update: { active: false }, create: { name: "Serviço - TESTE INATIVO", category: ServiceCategory.OTHER, defaultPrice: 999, durationMinutes: 60, active: false } });
  let order = await db.workOrder.findFirst({ where: { notes: label } });
  if (!order) order = await saveWorkOrder({ customerId: customer.id, vehicleId: vehicle.id, scheduledAt: new Date(Date.now() + 86400000), status: WorkOrderStatus.SCHEDULED, notes: label, items: [{ serviceId: cleaning.id, employeeId: alan.id, quantity: 2, unitPrice: 175 }, { serviceId: polish.id, employeeId: eric.id, quantity: 1, unitPrice: 340 }] }, admin.id);
  await markWorkOrderPaid(order.id, admin.id); await markWorkOrderPaid(order.id, admin.id);
  for (const entry of [{ description: "Entrada manual - TESTE", type: EntryType.INCOME, amount: 500 }, { description: "Compra de produtos - TESTE", type: EntryType.EXPENSE, amount: 120 }]) if (!await db.financialEntry.findFirst({ where: { description: entry.description } })) await db.financialEntry.create({ data: { ...entry, category: "Teste manual", competenceDate: new Date(), paidAt: new Date(), status: FinancialStatus.PAID } });
  const verified = await db.workOrder.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, appointment: true, financialEntry: true } });
  const activeEmployeeNames = (await db.employee.findMany({ where: { active: true }, select: { name: true } })).map((item) => item.name);
  const activeServiceNames = (await db.service.findMany({ where: { active: true }, select: { name: true } })).map((item) => item.name);
  console.log(JSON.stringify({ customer: customer.name, vehicle: vehicle.plate, workOrder: order.number, total: Number(verified.total), itemCount: verified.items.length, appointmentCount: verified.appointment ? 1 : 0, automaticFinancialEntries: verified.financialEntry ? 1 : 0, activeEmployeesIncludeInactiveTest: activeEmployeeNames.includes("Funcionário - TESTE INATIVO"), activeServicesIncludeInactiveTest: activeServiceNames.includes("Serviço - TESTE INATIVO") }, null, 2));
}
main().finally(() => db.$disconnect());
