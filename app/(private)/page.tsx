import { AppointmentStatus, EntryType, FinancialStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getDashboardDateBoundaries } from "@/lib/date-time";
import { formatCurrency } from "@/lib/domain";

export default async function Dashboard() {
  const { appointmentsFrom, financialMonthFrom, financialNextMonthFrom } =
    getDashboardDateBoundaries();
  const [today, inProgress, waiting, entries, expenses] = await Promise.all([
    db.appointment.count({
      where: {
        startsAt: { gte: appointmentsFrom },
        status: { not: AppointmentStatus.CANCELED },
      },
    }),
    db.workOrder.count({ where: { status: "IN_PROGRESS" } }),
    db.workOrder.count({ where: { status: { in: ["WAITING", "SCHEDULED"] } } }),
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: {
        type: EntryType.INCOME,
        status: FinancialStatus.PAID,
        competenceDate: {
          gte: financialMonthFrom,
          lt: financialNextMonthFrom,
        },
      },
    }),
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where: {
        type: EntryType.EXPENSE,
        status: FinancialStatus.PAID,
        competenceDate: {
          gte: financialMonthFrom,
          lt: financialNextMonthFrom,
        },
      },
    }),
  ]);
  const revenue = Number(entries._sum.amount ?? 0);
  const expense = Number(expenses._sum.amount ?? 0);

  return (
    <>
      <h1>Visão geral</h1>
      <p className="muted">O essencial da operação, sem ruído.</p>
      <section className="grid">
        <div className="card metric">
          <span>Agendamentos</span>
          <strong>{today}</strong>
          <small>de hoje em diante</small>
        </div>
        <div className="card metric">
          <span>Em execução</span>
          <strong>{inProgress}</strong>
        </div>
        <div className="card metric">
          <span>Aguardando</span>
          <strong>{waiting}</strong>
        </div>
        <div className="card metric">
          <span>Faturamento do mês</span>
          <strong>{formatCurrency(revenue)}</strong>
        </div>
        <div className="card metric">
          <span>Despesas do mês</span>
          <strong>{formatCurrency(expense)}</strong>
        </div>
        <div className="card metric">
          <span>Saldo do mês</span>
          <strong>{formatCurrency(revenue - expense)}</strong>
        </div>
      </section>
    </>
  );
}
