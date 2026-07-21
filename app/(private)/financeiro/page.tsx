import { EntryType, FinancialStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/domain";
import { formatCivilDate, getCivilDateInputValue } from "@/lib/date-time";
import { ActionForm } from "@/components/action-form";
import { requireAdminPage } from "@/lib/authorization";
import { createFinancialEntry, updateFinancialStatus } from "./actions";

const statusLabels: Record<FinancialStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELED: "Cancelado",
};

export default async function Finance() {
  await requireAdminPage();
  const [items, totals] = await Promise.all([
    db.financialEntry.findMany({
      include: { workOrder: true },
      orderBy: { competenceDate: "desc" },
      take: 100,
    }),
    db.financialEntry.groupBy({
      by: ["type"],
      where: { status: FinancialStatus.PAID },
      _sum: { amount: true },
    }),
  ]);
  const totalFor = (type: EntryType) =>
    Number(totals.find((total) => total.type === type)?._sum.amount ?? 0);
  const income = totalFor(EntryType.INCOME);
  const expense = totalFor(EntryType.EXPENSE);

  return (
    <>
      <h1>Financeiro</h1>
      <div className="grid">
        <div className="card metric">
          <span>Entradas pagas</span>
          <strong>{formatCurrency(income)}</strong>
        </div>
        <div className="card metric">
          <span>Saídas pagas</span>
          <strong>{formatCurrency(expense)}</strong>
        </div>
        <div className="card metric">
          <span>Saldo</span>
          <strong>{formatCurrency(income - expense)}</strong>
        </div>
      </div>

      <ActionForm action={createFinancialEntry} className="card form" resetOnSuccess>
        <h2>Novo lançamento</h2>
        <div className="grid">
          <label>
            Descrição
            <input name="description" required />
          </label>
          <label>
            Tipo
            <select name="type">
              <option value="EXPENSE">Saída</option>
              <option value="INCOME">Entrada</option>
            </select>
          </label>
          <label>
            Categoria
            <input
              name="category"
              placeholder="Fornecedor, produto, operacional..."
              required
            />
          </label>
          <label>
            Valor
            <input name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            Competência
            <input
              name="competenceDate"
              type="date"
              defaultValue={getCivilDateInputValue()}
              required
            />
          </label>
          <label>
            Vencimento
            <input name="dueDate" type="date" />
          </label>
          <label>
            Status
            <select name="status">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Vencido</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </label>
          <label>
            Forma de pagamento
            <select name="paymentMethod">
              <option value="">Não informada</option>
              <option value="CASH">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CREDIT_CARD">Crédito</option>
              <option value="DEBIT_CARD">Débito</option>
              <option value="BOLETO">Boleto</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>
        </div>
        <label>
          Observação
          <textarea name="notes" />
        </label>
        <button>Salvar lançamento</button>
      </ActionForm>

      <h2>Lançamentos</h2>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Origem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td>{formatCivilDate(entry.competenceDate)}</td>
                <td>
                  {entry.description}
                  <br />
                  <span className="muted">{entry.category}</span>
                </td>
                <td>{entry.type === EntryType.INCOME ? "Entrada" : "Saída"}</td>
                <td>{formatCurrency(entry.amount.toString())}</td>
                <td>
                  {entry.workOrder ? `OS #${entry.workOrder.number}` : "Manual"}
                </td>
                <td>
                  {entry.workOrder ? (
                    <>
                      <strong>{statusLabels[entry.status]}</strong>
                      <br />
                      <small className="muted">Gerenciado pela OS</small>
                    </>
                  ) : (
                    <ActionForm action={updateFinancialStatus} className="form">
                      <input type="hidden" name="id" value={entry.id} />
                      <select name="status" defaultValue={entry.status}>
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="OVERDUE">Vencido</option>
                        <option value="CANCELED">Cancelado</option>
                      </select>
                      <button>Atualizar</button>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!items.length && (
        <div className="card empty">Nenhum lançamento registrado.</div>
      )}
    </>
  );
}
