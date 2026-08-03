import Link from "next/link";
import {
  EntryType,
  FinancialStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceCategory,
  WorkOrderStatus,
} from "@prisma/client";
import { LineChart } from "@/components/ui/line-chart";
import { MetricCard } from "@/components/ui/metric-card";
import {
  formatCivilDate,
  getAppTimeZone,
  getAppTimeZoneDisplayName,
  getCivilDateInputValue,
} from "@/lib/date-time";
import { formatCurrency, formatDate } from "@/lib/domain";
import {
  adjacentMonth,
  historyPeriodFormYear,
  resolveHistoryPeriod,
} from "@/lib/history-period";
import { requireAdminPage } from "@/lib/authorization";
import {
  getHistoryData,
  type HistoryFilters,
} from "@/server/modules/history/public";

type Search = Record<string, string | string[] | undefined>;
const tabs = [
  ["overview", "Visão geral"],
  ["orders", "Ordens de Serviço"],
  ["finance", "Financeiro"],
  ["services", "Serviços"],
  ["employees", "Funcionários"],
  ["customers", "Clientes e veículos"],
  ["appointments", "Agendamentos"],
  ["quotes", "Orçamentos"],
  ["media", "Documentos e fotos"],
] as const;
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function queryWith(values: URLSearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams(values);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return `/historico?${next.toString()}`;
}

function SelectOptions({ values }: { values: readonly string[] }) {
  return <>{values.map((value) => <option key={value} value={value}>{value}</option>)}</>;
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPage("history:read");
  const raw = await searchParams;
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const selected = first(value);
    if (selected) values.set(key, selected);
  }
  const period = resolveHistoryPeriod({
    mode: first(raw.mode),
    year: first(raw.year),
    month: first(raw.month),
    from: first(raw.from),
    to: first(raw.to),
  });
  const selectedTab = tabs.some(([key]) => key === first(raw.tab))
    ? first(raw.tab)!
    : "overview";
  const page = Math.max(1, Number(first(raw.page)) || 1);
  const pageSize = [20, 50, 100].includes(Number(first(raw.pageSize)))
    ? Number(first(raw.pageSize))
    : 20;
  const filters: HistoryFilters = {
    q: first(raw.q),
    status: first(raw.status),
    payment: first(raw.payment),
    employeeId: first(raw.employeeId),
    serviceId: first(raw.serviceId),
    category: first(raw.category),
    paymentMethod: first(raw.paymentMethod),
    financialType: first(raw.financialType),
    financialStatus: first(raw.financialStatus),
    origin: first(raw.origin),
  };
  const data = await getHistoryData({ period, filters, page, pageSize, timeZone: getAppTimeZone() });
  const [currentYear, currentMonth] = getCivilDateInputValue(
    new Date(),
    getAppTimeZone(),
  )
    .split("-")
    .map(Number);
  const previous = adjacentMonth(period.year, period.month, -1);
  const next = adjacentMonth(period.year, period.month, 1);
  const returnTo = `/historico?${values.toString()}`;
  const pageTotal = selectedTab === "finance" ? data.totalFinances : data.totalOrders;
  const totalPages = Math.max(1, Math.ceil(pageTotal / pageSize));

  return (
    <div className="page-layout history-page">
      <div className="top history-heading">
        <div>
          <h1>Histórico Geral</h1>
          <p className="muted">Consulta somente leitura · {period.label}</p>
        </div>
        <div className="actions">
          <Link className="button" href={queryWith(values, { mode: "month", year: String(previous.year), month: String(previous.month), page: null })}>← Mês anterior</Link>
          <Link className="button" href={queryWith(values, { mode: "month", year: String(next.year), month: String(next.month), page: null })}>Próximo mês →</Link>
        </div>
      </div>

      <details className="card form history-filters" open>
        <summary><strong>Filtros do histórico</strong></summary>
        <div className="actions history-quick-actions">
          <Link className="button" href="/historico">Mês atual</Link>
          <Link className="button" href={queryWith(values, { mode: "month", year: String(previous.year), month: String(previous.month), page: null })}>Mês anterior</Link>
          <Link className="button" href={queryWith(values, { mode: "last3", year: String(currentYear), month: String(currentMonth), page: null })}>Últimos 3 meses</Link>
          <Link className="button" href={queryWith(values, { mode: "last6", year: String(currentYear), month: String(currentMonth), page: null })}>Últimos 6 meses</Link>
          <Link className="button" href={queryWith(values, { mode: "year", year: String(currentYear), page: null })}>Ano atual</Link>
          <Link className="button" href={queryWith(values, { mode: "previousYear", year: String(currentYear), page: null })}>Ano anterior</Link>
          <Link className="button" href={queryWith(values, { mode: "all", page: null })}>Todo o período</Link>
        </div>
        <form key={values.toString() || "default"} method="get" className="form history-filter-form">
          <input type="hidden" name="tab" value={selectedTab} />
          <div className="grid history-filter-grid">
            <label>Período<select name="mode" defaultValue={period.mode}><option value="month">Mês e ano</option><option value="custom">Personalizado</option><option value="last3">Últimos 3 meses</option><option value="last6">Últimos 6 meses</option><option value="year">Ano</option><option value="previousYear">Ano anterior</option><option value="all">Todo o período</option></select></label>
            <label>Mês<select name="month" defaultValue={String(period.month)}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
            <label>Ano<input name="year" type="number" min="1900" max="2200" defaultValue={historyPeriodFormYear(period)} /></label>
            <label>Data inicial<input name="from" type="date" defaultValue={period.fromValue} /></label>
            <label>Data final<input name="to" type="date" defaultValue={period.toValue} /></label>
            <label>Busca geral<input name="q" defaultValue={filters.q} placeholder="OS, cliente, telefone, placa, serviço..." /></label>
            <label>Status da OS<select name="status" defaultValue={filters.status ?? ""}><option value="">Todos</option><SelectOptions values={Object.values(WorkOrderStatus)} /></select></label>
            <label>Pagamento<select name="payment" defaultValue={filters.payment ?? ""}><option value="">Todos</option><SelectOptions values={Object.values(PaymentStatus)} /></select></label>
            <label>Funcionário<select name="employeeId" defaultValue={filters.employeeId ?? ""}><option value="">Todos</option>{data.employees.map((item) => <option value={item.id} key={item.id}>{item.name}{item.active ? "" : " (inativo)"}</option>)}</select></label>
            <label>Serviço<select name="serviceId" defaultValue={filters.serviceId ?? ""}><option value="">Todos</option>{data.services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Categoria<select name="category" defaultValue={filters.category ?? ""}><option value="">Todas</option><SelectOptions values={Object.values(ServiceCategory)} /></select></label>
            <label>Forma de pagamento<select name="paymentMethod" defaultValue={filters.paymentMethod ?? ""}><option value="">Todas</option><SelectOptions values={Object.values(PaymentMethod)} /></select></label>
            <label>Tipo financeiro<select name="financialType" defaultValue={filters.financialType ?? ""}><option value="">Todos</option><SelectOptions values={Object.values(EntryType)} /></select></label>
            <label>Status financeiro<select name="financialStatus" defaultValue={filters.financialStatus ?? ""}><option value="">Todos</option><SelectOptions values={Object.values(FinancialStatus)} /></select></label>
            <label>Origem<select name="origin" defaultValue={filters.origin ?? ""}><option value="">Todas</option><option value="manual">Manual</option><option value="order">Ordem de Serviço</option></select></label>
            <label>Registros por página<select name="pageSize" defaultValue={String(pageSize)}><option>20</option><option>50</option><option>100</option></select></label>
          </div>
          <div className="actions"><button type="submit">Aplicar filtros</button><Link className="button" href="/historico">Limpar filtros</Link></div>
        </form>
      </details>

      <p className="muted history-rules">Regras: Ordens por entrada; financeiro por competência; agendamentos por data agendada; cadastros, fotos, assinaturas e PDFs por criação. Intervalos respeitam {getAppTimeZoneDisplayName()} ({getAppTimeZone()}) e usam limite final exclusivo.</p>

      <div className="grid history-summary">
        <MetricCard label="Ordens" value={String(data.summary.orders)} />
        <MetricCard label="Concluídas" value={String(data.summary.completedOrders)} />
        <MetricCard label="Canceladas" value={String(data.summary.canceledOrders)} />
        <MetricCard label="Clientes atendidos" value={String(data.summary.customers)} />
        <MetricCard label="Veículos atendidos" value={String(data.summary.vehicles)} />
        <MetricCard label="Serviços realizados" value={String(data.summary.services)} />
        <MetricCard label="Entradas pagas" value={formatCurrency(data.summary.income)} />
        <MetricCard label="Saídas pagas" value={formatCurrency(data.summary.expense)} />
        <MetricCard label="Saldo realizado" value={formatCurrency(data.summary.balance)} />
        <MetricCard label="A receber" value={formatCurrency(data.summary.receivable)} />
        <MetricCard label="A pagar" value={formatCurrency(data.summary.payable)} />
        <MetricCard label="Ticket médio" value={formatCurrency(data.summary.ticketAverage)} />
        <MetricCard label="Agendamentos" value={String(data.summary.appointments)} />
        <MetricCard label="Agendamentos cancelados" value={String(data.summary.canceledAppointments)} />
        <MetricCard label="Não compareceram" value={String(data.summary.noShows)} />
        <MetricCard label="Orçamentos" value={String(data.summary.quotes)} />
        <MetricCard label="Orçamentos aprovados" value={String(data.summary.approvedQuotes)} />
        <MetricCard label="Orçamentos convertidos" value={String(data.summary.convertedQuotes)} />
      </div>

      <nav className="tabs history-tabs" aria-label="Seções do histórico">
        {tabs.map(([key, label]) => <Link key={key} className={selectedTab === key ? "active" : ""} href={queryWith(values, { tab: key, page: null })}>{label}</Link>)}
      </nav>

      {selectedTab === "overview" && <>
        <div className="card form">
          <h2>Visão anual de {period.year}</h2>
          <LineChart labels={monthNames.map((name) => name.slice(0, 3))} series={[
            { name: "Entradas", color: "var(--chart-1)", values: data.annual.map((item) => item.income) },
            { name: "Saídas", color: "var(--chart-2)", dashed: true, values: data.annual.map((item) => item.expense) },
            { name: "Saldo", color: "var(--success)", values: data.annual.map((item) => item.balance) },
          ]} />
        </div>
        <div className="card form">
          <h2>Faturamento por categoria de serviço</h2>
          <LineChart
            labels={data.annualCategoryRevenue.map((item) => item.category)}
            series={[{
              name: "Faturamento",
              color: "var(--chart-1)",
              values: data.annualCategoryRevenue.map((item) => item.value),
            }]}
          />
        </div>
        <div className="card table-wrap"><table className="table"><thead><tr><th>Mês</th><th>Ordens</th><th>Serviços</th><th>Entradas</th><th>Saídas</th><th>Saldo</th><th>Clientes</th><th>Veículos</th></tr></thead><tbody>{data.annual.map((item) => <tr key={item.month}><td><Link href={queryWith(values, { mode: "month", year: String(period.year), month: String(item.month), page: null })}><strong>{monthNames[item.month - 1]}</strong></Link></td><td>{item.orders}</td><td>{item.services}</td><td>{formatCurrency(item.income)}</td><td>{formatCurrency(item.expense)}</td><td>{formatCurrency(item.balance)}</td><td>{item.customers}</td><td>{item.vehicles}</td></tr>)}</tbody></table></div>
        <h2>Faturamento histórico por serviço e categoria</h2>
        <div className="card table-wrap"><table className="table"><thead><tr><th>Serviço</th><th>Categoria</th><th>Quantidade</th><th>Ordens</th><th>Valor</th><th>Média</th></tr></thead><tbody>{data.serviceRanking.slice(0, 20).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.category}</td><td>{item.quantity}</td><td>{item.orders}</td><td>{formatCurrency(item.value)}</td><td>{formatCurrency(item.quantity ? item.value / item.quantity : 0)}</td></tr>)}</tbody></table></div>
      </>}

      {selectedTab === "orders" && <div className="card table-wrap"><table className="table"><thead><tr><th>OS</th><th>Entrada/Conclusão</th><th>Cliente/Veículo</th><th>Serviços/Responsáveis</th><th>Status</th><th>Pagamento</th><th>Total</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td><Link href={`/ordens/${order.id}?returnTo=${encodeURIComponent(returnTo)}`}><strong>#{order.number}</strong></Link></td><td>{formatDate(order.entryAt)}<br/><span className="muted">{order.deliveredAt ? formatDate(order.deliveredAt) : "Sem entrega registrada"}</span></td><td>{order.customer.name}<br/>{order.vehicle.plate} · {order.vehicle.model}</td><td>{order.items.map((item) => `${item.service.name} (${item.employee?.name ?? "A definir"})`).join(", ")}</td><td>{order.status}</td><td>{order.paymentStatus}<br/>{order.paymentMethod ?? "Não informada"}</td><td>{formatCurrency(order.total.toString())}</td></tr>)}{!data.orders.length && <tr><td colSpan={7}>Nenhum registro encontrado para o período selecionado.</td></tr>}</tbody></table></div>}

      {selectedTab === "finance" && <><div className="grid"><MetricCard label="Entradas pagas" value={formatCurrency(data.summary.income)} /><MetricCard label="Saídas pagas" value={formatCurrency(data.summary.expense)} /><MetricCard label="Saldo realizado" value={formatCurrency(data.summary.balance)} /><MetricCard label="A receber" value={formatCurrency(data.summary.receivable)} /><MetricCard label="A pagar" value={formatCurrency(data.summary.payable)} /></div><div className="card table-wrap"><table className="table"><thead><tr><th>Competência</th><th>Descrição</th><th>Vencimento/Pagamento</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Origem</th><th>Observação</th></tr></thead><tbody>{data.finances.map((item) => <tr key={item.id}><td>{formatCivilDate(item.competenceDate)}</td><td>{item.description}<br/><span className="muted">{item.category}</span></td><td>{item.dueDate ? formatCivilDate(item.dueDate) : "-"}<br/>{item.paidAt ? formatDate(item.paidAt) : "Não pago"}</td><td>{item.type}</td><td>{formatCurrency(item.amount.toString())}</td><td>{item.status}</td><td>{item.workOrder ? `OS #${item.workOrder.number}` : "Manual"}</td><td>{item.notes ?? "-"}</td></tr>)}{!data.finances.length && <tr><td colSpan={8}>Nenhum registro encontrado para o período selecionado.</td></tr>}</tbody></table></div></>}

      {selectedTab === "services" && <div className="card table-wrap"><table className="table"><thead><tr><th>Serviço</th><th>Categoria</th><th>Quantidade</th><th>Ordens</th><th>Valor histórico</th><th>Valor médio</th></tr></thead><tbody>{data.serviceRanking.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.category}</td><td>{item.quantity}</td><td>{item.orders}</td><td>{formatCurrency(item.value)}</td><td>{formatCurrency(item.quantity ? item.value / item.quantity : 0)}</td></tr>)}{!data.serviceRanking.length && <tr><td colSpan={6}>Nenhum registro encontrado para o período selecionado.</td></tr>}</tbody></table></div>}

      {selectedTab === "employees" && <div className="card table-wrap"><table className="table"><thead><tr><th>Funcionário</th><th>Status atual</th><th>Serviços</th><th>Ordens</th><th>Clientes</th><th>Veículos</th><th>Valor relacionado</th></tr></thead><tbody>{data.employeeRanking.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.active ? "Ativo" : "Inativo"}</td><td>{item.quantity}</td><td>{item.orders}</td><td>{item.customers}</td><td>{item.vehicles}</td><td>{formatCurrency(item.value)}</td></tr>)}{!data.employeeRanking.length && <tr><td colSpan={7}>Nenhum registro encontrado para o período selecionado.</td></tr>}</tbody></table></div>}

      {selectedTab === "customers" && <div className="grid"><div><h2>Clientes atendidos</h2><div className="card table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Atendimentos</th><th>Veículos</th><th>Valor</th></tr></thead><tbody>{data.customerRanking.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.orders}</td><td>{item.vehicles}</td><td>{formatCurrency(item.value)}</td></tr>)}</tbody></table></div><p className="muted">Novos clientes no período: {data.summary.newCustomers}</p></div><div><h2>Veículos atendidos</h2><div className="card table-wrap"><table className="table"><thead><tr><th>Veículo</th><th>Atendimentos</th><th>Valor</th></tr></thead><tbody>{data.vehicleRanking.map((item) => <tr key={item.id}><td>{item.label}</td><td>{item.orders}</td><td>{formatCurrency(item.value)}</td></tr>)}</tbody></table></div><p className="muted">Novos veículos no período: {data.summary.newVehicles}</p></div></div>}

      {selectedTab === "appointments" && <><div className="actions">{data.appointmentGroups.map((item) => <span className="card" key={item.status}>{item.status}: <strong>{item._count}</strong></span>)}</div><div className="card table-wrap"><table className="table"><thead><tr><th>Data</th><th>Cliente</th><th>Veículo</th><th>Serviços</th><th>Funcionário</th><th>Origem</th><th>Status</th><th>OS</th></tr></thead><tbody>{data.appointments.map((item) => <tr key={item.id}><td>{formatDate(item.startsAt)}</td><td>{item.customer.name}</td><td>{item.vehicle.plate}</td><td>{item.workOrder?.items.map((row) => row.service.name).join(", ") ?? "-"}</td><td>{item.employee?.name ?? "-"}</td><td>{item.origin}</td><td>{item.status}</td><td>{item.workOrderId ? <Link href={`/ordens/${item.workOrderId}?returnTo=${encodeURIComponent(returnTo)}`}>Abrir</Link> : "-"}</td></tr>)}{!data.appointments.length && <tr><td colSpan={8}>Nenhum registro encontrado para o período selecionado.</td></tr>}</tbody></table></div></>}

      {selectedTab === "quotes" && <div className="card empty"><h2>Orçamentos</h2><p>O modelo de dados atual não possui entidade de orçamento. Para não inventar números, os indicadores permanecem em zero até o módulo operacional de orçamentos ser implementado.</p></div>}

      {selectedTab === "media" && <div className="grid"><div className="card"><h2>PDFs ({data.documents.length})</h2>{data.documents.map((item) => <p key={item.id}><Link href={`/ordens/${item.workOrderId}?section=documents&returnTo=${encodeURIComponent(returnTo)}`}>OS #{item.workOrder.number} · versão {item.version}</Link><br/><span className="muted">{item.workOrder.customer.name} · {item.workOrder.vehicle.plate} · {item.generatedBy.name} · {formatDate(item.createdAt)}</span></p>)}</div><div className="card"><h2>Fotos ({data.photos.length})</h2>{data.photos.map((item) => <p key={item.id}><Link href={`/ordens/${item.workOrderId}?section=photos&returnTo=${encodeURIComponent(returnTo)}`}>OS #{item.workOrder.number} · {item.category}</Link><br/><span className="muted">{item.workOrder.customer.name} · {item.workOrder.vehicle.plate} · {item.uploadedBy.name} · {formatDate(item.createdAt)}</span></p>)}</div><div className="card"><h2>Assinaturas ({data.signatures.length})</h2>{data.signatures.map((item) => <p key={item.id}><Link href={`/ordens/${item.workOrderId}?section=signatures&returnTo=${encodeURIComponent(returnTo)}`}>OS #{item.workOrder.number} · {item.type}</Link><br/><span className="muted">{item.signerName} · {item.collectedBy.name} · {formatDate(item.createdAt)}</span></p>)}</div></div>}

      {(selectedTab === "orders" || selectedTab === "finance") && totalPages > 1 && <nav className="pagination" aria-label="Paginação"><span>{page > 1 && <Link className="button" href={queryWith(values, { page: String(page - 1) })}>Anterior</Link>}</span><span>Página {page} de {totalPages}</span><span>{page < totalPages && <Link className="button" href={queryWith(values, { page: String(page + 1) })}>Próxima</Link>}</span></nav>}

      <form action="/api/history/export" method="get" target="_blank" className="card form history-export">
        <h2>Exportar relatório</h2>
        {["mode", "year", "month", "from", "to", "q", "status", "payment", "employeeId", "serviceId", "category", "paymentMethod", "financialType", "financialStatus", "origin"].map((key) => values.get(key) ? <input key={key} type="hidden" name={key} value={values.get(key)!} /> : null)}
        <div className="actions"><label><input type="checkbox" name="include" value="summary" defaultChecked /> Resumo</label><label><input type="checkbox" name="include" value="orders" defaultChecked /> Ordens</label><label><input type="checkbox" name="include" value="finance" defaultChecked /> Financeiro</label><label><input type="checkbox" name="include" value="services" defaultChecked /> Serviços</label><label><input type="checkbox" name="include" value="employees" defaultChecked /> Funcionários</label><label><input type="checkbox" name="include" value="customers" defaultChecked /> Clientes e veículos</label></div>
        <div className="actions"><button name="format" value="pdf">Exportar PDF</button><button name="format" value="csv">Exportar CSV</button></div>
      </form>
    </div>
  );
}
