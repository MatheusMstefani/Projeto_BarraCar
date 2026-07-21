import Link from "next/link";
import {
  AppointmentStatus,
  EntryType,
  FinancialStatus,
  PaymentStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { auth } from "@/auth";
import { LineChart } from "@/components/ui/line-chart";
import { Icon } from "@/components/ui/icon";
import { MetricCard } from "@/components/ui/metric-card";
import { QuickAction } from "@/components/ui/quick-action";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { db } from "@/lib/db";
import { getCivilDateInputValue, getDashboardDateBoundaries } from "@/lib/date-time";
import { formatCurrency, formatDate } from "@/lib/domain";

function lastSixMonths() {
  const [year, month] = getCivilDateInputValue().split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 1));
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
      .format(date)
      .replace(".", "");
    return { key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`, label, start: date };
  });
}

export default async function Dashboard() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const firstName = session?.user.name?.split(" ")[0] ?? "";
  const { appointmentsFrom, financialMonthFrom, financialNextMonthFrom } =
    getDashboardDateBoundaries();
  const months = lastSixMonths();

  const [today, inProgress, waiting, activeCustomers, recentOrders] = await Promise.all([
    db.appointment.count({
      where: { startsAt: { gte: appointmentsFrom }, status: { not: AppointmentStatus.CANCELED } },
    }),
    db.workOrder.count({ where: { status: WorkOrderStatus.IN_PROGRESS } }),
    db.workOrder.count({
      where: { status: { in: [WorkOrderStatus.WAITING, WorkOrderStatus.SCHEDULED] } },
    }),
    db.customer.count({ where: { active: true } }),
    db.workOrder.findMany({
      include: {
        customer: true,
        vehicle: true,
        checklistItems: { select: { status: true } },
      },
      orderBy: { number: "desc" },
      take: 5,
    }),
  ]);

  const [receivables, incomeMonth, expenseMonth, chartEntries, upcoming] = isAdmin
    ? await Promise.all([
        db.workOrder.aggregate({
          _sum: { total: true },
          _count: true,
          where: {
            paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
            status: { not: WorkOrderStatus.CANCELED },
          },
        }),
        db.financialEntry.aggregate({
          _sum: { amount: true },
          where: {
            type: EntryType.INCOME,
            status: FinancialStatus.PAID,
            competenceDate: { gte: financialMonthFrom, lt: financialNextMonthFrom },
          },
        }),
        db.financialEntry.aggregate({
          _sum: { amount: true },
          where: {
            type: EntryType.EXPENSE,
            status: FinancialStatus.PAID,
            competenceDate: { gte: financialMonthFrom, lt: financialNextMonthFrom },
          },
        }),
        db.financialEntry.findMany({
          where: { status: FinancialStatus.PAID, competenceDate: { gte: months[0].start } },
          select: { type: true, amount: true, competenceDate: true },
        }),
        Promise.resolve(null),
      ])
    : [
        null,
        null,
        null,
        null,
        await db.appointment.findMany({
          where: { startsAt: { gte: appointmentsFrom }, status: { not: AppointmentStatus.CANCELED } },
          include: { customer: true, vehicle: true },
          orderBy: { startsAt: "asc" },
          take: 6,
        }),
      ];

  const revenue = Number(incomeMonth?._sum.amount ?? 0);
  const expense = Number(expenseMonth?._sum.amount ?? 0);
  const balance = revenue - expense;
  const byMonth = new Map(months.map((m) => [m.key, { income: 0, expense: 0 }]));
  for (const entry of chartEntries ?? []) {
    const bucket = byMonth.get(
      `${entry.competenceDate.getUTCFullYear()}-${entry.competenceDate.getUTCMonth()}`,
    );
    if (!bucket) continue;
    if (entry.type === EntryType.INCOME) bucket.income += Number(entry.amount);
    else bucket.expense += Number(entry.amount);
  }

  return (
    <>
      <div className="mb-lg">
        <h2 className="text-headline-md text-on-surface">Olá, {firstName}!</h2>
        <p className="text-body-md text-on-surface-variant">
          Bem-vindo de volta ao console da Barracar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <MetricCard label="Agendamentos" value={String(today)} hint="de hoje em diante" />
        <MetricCard
          label="Em execução"
          value={String(inProgress)}
          badge={inProgress ? { label: "Operação", tone: "info" } : undefined}
        />
        <MetricCard label="Aguardando" value={String(waiting)} hint="na fila e agendadas" />
        <MetricCard label="Clientes ativos" value={String(activeCustomers)} />
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
          <MetricCard
            label="A receber"
            value={formatCurrency(Number(receivables?._sum.total ?? 0))}
            hint={`${receivables?._count ?? 0} ordens sem pagamento`}
            badge={{ label: "Pendente", tone: "warning" }}
          />
          <MetricCard
            label="Faturamento do mês"
            value={formatCurrency(revenue)}
            badge={{ label: "Entradas", tone: "info" }}
          />
          <MetricCard label="Despesas do mês" value={formatCurrency(expense)} />
          <MetricCard
            label="Saldo do mês"
            value={formatCurrency(balance)}
            badge={
              balance >= 0
                ? { label: "Positivo", tone: "success" }
                : { label: "Negativo", tone: "danger" }
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg mb-lg">
        <div className="lg:col-span-4 space-y-md">
          {isAdmin ? (
            <>
              <QuickAction href="/ordens" icon="receipt_long" title="Nova ordem" description="Abra uma OS para um veículo" />
              <QuickAction href="/clientes" icon="person_add" title="Novo cliente" description="Cadastre um cliente" />
              <QuickAction href="/veiculos" icon="directions_car" title="Novo veículo" description="Vincule um veículo a um cliente" />
            </>
          ) : (
            <>
              <QuickAction href="/ordens" icon="receipt_long" title="Ordens de serviço" description="Checklist, fotos e assinaturas" />
              <QuickAction href="/agenda" icon="calendar_month" title="Agenda" description="Veja os próximos atendimentos" />
              <QuickAction href="/veiculos" icon="directions_car" title="Veículos" description="Consulte os veículos cadastrados" />
            </>
          )}
        </div>

        <div className="lg:col-span-8 bg-surface-container-low border border-outline-variant rounded-xl p-lg flex flex-col relative overflow-hidden">
          {isAdmin ? (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h3 className="text-title-sm text-on-surface">Fluxo financeiro — últimos 6 meses</h3>
                <div className="flex items-center space-x-md text-[10px] font-bold">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-chart-1"></div>
                    <span className="text-on-surface-variant">Entradas</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-chart-2"></div>
                    <span className="text-on-surface-variant">Saídas</span>
                  </div>
                </div>
              </div>
              <LineChart
                labels={months.map((m) => m.label)}
                series={[
                  {
                    name: "Entradas",
                    color: "var(--chart-1)",
                    values: months.map((m) => byMonth.get(m.key)?.income ?? 0),
                  },
                  {
                    name: "Saídas",
                    color: "var(--chart-2)",
                    dashed: true,
                    values: months.map((m) => byMonth.get(m.key)?.expense ?? 0),
                  },
                ]}
              />
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h3 className="text-title-sm text-on-surface">Próximos atendimentos</h3>
                <Link className="text-primary font-bold text-xs hover:underline" href="/agenda">
                  Ver agenda
                </Link>
              </div>
              <div className="space-y-sm">
                {(upcoming ?? []).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between border-b border-outline-variant last:border-0 pb-sm">
                    <div>
                      <strong className="text-body-md">{formatDate(appointment.startsAt)}</strong>
                      <p className="text-xs text-on-surface-variant">
                        {appointment.customer.name} · {appointment.vehicle.plate}
                      </p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant" />
                  </div>
                ))}
                {!(upcoming ?? []).length && (
                  <p className="text-body-sm text-on-surface-variant">Nenhum atendimento agendado.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-md border-b border-outline-variant flex items-center">
          <h3 className="text-title-sm text-on-surface">Últimas ordens de serviço</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-on-surface-variant text-label-xs uppercase tracking-wider border-b border-outline-variant">
                <th className="p-md">Ordem</th>
                <th className="p-md">Checklist</th>
                <th className="p-md">Status</th>
                <th className="p-md">Pagamento</th>
                <th className="p-md">Total</th>
                <th className="p-md w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="text-body-sm">
              {recentOrders.map((order) => {
                const totalItems = order.checklistItems.length;
                const doneItems = order.checklistItems.filter((i) => i.status !== "NOT_CHECKED").length;
                const percent = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
                return (
                  <tr key={order.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">
                          {order.number}
                        </div>
                        <div>
                          <Link href={`/ordens/${order.id}`} className="font-semibold hover:text-primary">
                            {order.customer.name}
                          </Link>
                          <div className="text-xs text-on-surface-variant">{order.vehicle.plate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-md min-w-[160px]">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                          <div className="h-full bg-primary-container" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="w-8 text-right">{percent}%</span>
                      </div>
                    </td>
                    <td className="p-md">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="p-md">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="p-md font-semibold">{formatCurrency(order.total.toString())}</td>
                    <td className="p-md text-center">
                      <Link href={`/ordens/${order.id}`} aria-label={`Abrir OS ${order.number}`}>
                        <Icon name="chevron_right" className="opacity-40 hover:opacity-100" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!recentOrders.length && (
                <tr>
                  <td className="p-md text-on-surface-variant" colSpan={6}>
                    Nenhuma ordem de serviço cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-md border-t border-outline-variant flex justify-end items-center text-xs font-bold">
          <Link href="/ordens" className="text-primary hover:underline">
            Ver todas as ordens →
          </Link>
        </div>
      </div>
    </>
  );
}
