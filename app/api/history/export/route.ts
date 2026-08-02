import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { csvCell } from "@/lib/csv";
import { formatCivilDate, getAppTimeZone } from "@/lib/date-time";
import { formatCurrency, formatDate } from "@/lib/domain";
import { resolveHistoryPeriod } from "@/lib/history-period";
import { db } from "@/lib/db";
import { readBrandLogo } from "@/server/branding";
import { getHistoryData } from "@/server/services/history";

const pdfText = (value: unknown) =>
  String(value ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return new NextResponse("Não autorizado", { status: 403 });
  }
  const query = request.nextUrl.searchParams;
  const timeZone = getAppTimeZone();
  const period = resolveHistoryPeriod({
    mode: query.get("mode") ?? undefined,
    year: query.get("year") ?? undefined,
    month: query.get("month") ?? undefined,
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
  }, undefined, timeZone);
  const include = new Set(query.getAll("include"));
  if (!include.size) ["summary", "orders", "finance", "services", "employees", "customers"].forEach((item) => include.add(item));
  const [data, settings] = await Promise.all([getHistoryData({
    period,
    timeZone,
    unpaginated: true,
    filters: {
      q: query.get("q") ?? undefined,
      status: query.get("status") ?? undefined,
      payment: query.get("payment") ?? undefined,
      employeeId: query.get("employeeId") ?? undefined,
      serviceId: query.get("serviceId") ?? undefined,
      category: query.get("category") ?? undefined,
      paymentMethod: query.get("paymentMethod") ?? undefined,
      financialType: query.get("financialType") ?? undefined,
      financialStatus: query.get("financialStatus") ?? undefined,
      origin: query.get("origin") ?? undefined,
    },
  }), db.companySettings.findUnique({ where: { id: "default" }, select: { name: true } })]);
  const companyName = settings?.name ?? "Barracar Gestão";
  const filename = `historico-${period.year}-${String(period.month).padStart(2, "0")}`;

  if (query.get("format") === "csv") {
    const rows: string[][] = [[companyName, period.label]];
    if (include.has("summary")) {
      rows.push(
        ["Resumo", "Ordens", String(data.summary.orders)],
        ["Resumo", "Entradas", String(data.summary.income)],
        ["Resumo", "Saídas", String(data.summary.expense)],
        ["Resumo", "Saldo", String(data.summary.balance)],
      );
    }
    if (include.has("orders")) {
      rows.push(["Ordens", "Número", "Entrada", "Cliente", "Placa", "Status", "Pagamento", "Total"]);
      for (const order of data.orders) rows.push(["Ordens", String(order.number), formatDate(order.entryAt), order.customer.name, order.vehicle.plate, order.status, order.paymentStatus, order.total.toString()]);
    }
    if (include.has("finance")) {
      rows.push(["Financeiro", "Competência", "Descrição", "Tipo", "Status", "Valor", "Origem"]);
      for (const entry of data.finances) rows.push(["Financeiro", formatCivilDate(entry.competenceDate), entry.description, entry.type, entry.status, entry.amount.toString(), entry.workOrder ? `OS #${entry.workOrder.number}` : "Manual"]);
    }
    if (include.has("services")) {
      rows.push(["Serviços", "Nome", "Categoria", "Quantidade", "Ordens", "Valor"]);
      for (const item of data.serviceRanking) rows.push(["Serviços", item.name, item.category, String(item.quantity), String(item.orders), String(item.value)]);
    }
    if (include.has("employees")) {
      rows.push(["Funcionários", "Nome", "Ativo", "Serviços", "Ordens", "Valor"]);
      for (const item of data.employeeRanking) rows.push(["Funcionários", item.name, String(item.active), String(item.quantity), String(item.orders), String(item.value)]);
    }
    if (include.has("customers")) {
      rows.push(["Clientes", "Nome", "Atendimentos", "Veículos", "Valor"]);
      for (const item of data.customerRanking) rows.push(["Clientes", item.name, String(item.orders), String(item.vehicles), String(item.value)]);
      rows.push(["Veículos", "Placa/modelo", "Atendimentos", "Valor"]);
      for (const item of data.vehicleRanking) rows.push(["Veículos", item.label, String(item.orders), String(item.value)]);
    }
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brandLogo = await pdf.embedPng(await readBrandLogo());
  const width = 595.28;
  const height = 841.89;
  const margin = 38;
  const logoDimensions = brandLogo.scaleToFit(200, 100);
  let y = 0;
  const createPage = (): PDFPage => {
    const nextPage = pdf.addPage([width, height]);
    nextPage.drawImage(brandLogo, {
      x: (width - logoDimensions.width) / 2,
      y: height - margin - logoDimensions.height,
      width: logoDimensions.width,
      height: logoDimensions.height,
    });
    y = height - margin - logoDimensions.height - 14;
    return nextPage;
  };
  let page = createPage();
  const addLine = (text: string, options: { size?: number; strong?: boolean } = {}) => {
    const size = options.size ?? 9;
    if (y < 45) {
      page = createPage();
    }
    page.drawText(pdfText(text).slice(0, 110), {
      x: 38,
      y,
      size,
      font: options.strong ? bold : regular,
      color: rgb(0.1, 0.12, 0.16),
    });
    y -= size + 5;
  };
  addLine(`${companyName} - Relatório Histórico`, { size: 16, strong: true });
  addLine(`Período: ${period.label}`, { size: 11, strong: true });
  addLine(`Gerado em: ${formatDate(new Date())} por ${session.user.name}`);
  y -= 8;
  if (include.has("summary")) {
    addLine("Resumo do período", { size: 12, strong: true });
    addLine(`Ordens: ${data.summary.orders} | Concluídas: ${data.summary.completedOrders} | Canceladas: ${data.summary.canceledOrders}`);
    addLine(`Clientes: ${data.summary.customers} | Veículos: ${data.summary.vehicles} | Serviços: ${data.summary.services}`);
    addLine(`Entradas: ${formatCurrency(data.summary.income)} | Saídas: ${formatCurrency(data.summary.expense)} | Saldo: ${formatCurrency(data.summary.balance)}`);
    addLine(`A receber: ${formatCurrency(data.summary.receivable)} | A pagar: ${formatCurrency(data.summary.payable)} | Ticket médio: ${formatCurrency(data.summary.ticketAverage)}`);
    y -= 8;

    addLine(`Fluxo financeiro anual de ${period.year}`, { size: 12, strong: true });
    const annualMaximum = Math.max(
      1,
      ...data.annual.flatMap((item) => [item.income, item.expense]),
    );
    addLine("Entradas (azul) | Saídas (cinza) | saldo ao final da linha", { size: 8 });
    for (const item of data.annual) {
      if (y < 70) {
        page = createPage();
      }
      const incomeWidth = (item.income / annualMaximum) * 120;
      const expenseWidth = (item.expense / annualMaximum) * 120;
      page.drawText(String(item.month).padStart(2, "0"), { x: 38, y, size: 8, font: bold });
      page.drawRectangle({ x: 60, y: y + 1, width: incomeWidth, height: 4, color: rgb(0.15, 0.39, 0.92) });
      page.drawRectangle({ x: 195, y: y + 1, width: expenseWidth, height: 4, color: rgb(0.39, 0.45, 0.55) });
      page.drawText(pdfText(formatCurrency(item.balance)), { x: 335, y, size: 8, font: regular });
      y -= 12;
    }
    y -= 8;
  }
  if (include.has("orders")) {
    addLine("Ordens de Serviço", { size: 12, strong: true });
    for (const order of data.orders) addLine(`#${order.number} | ${formatDate(order.entryAt)} | ${order.customer.name} | ${order.vehicle.plate} | ${order.status} | ${formatCurrency(order.total.toString())}`);
    y -= 8;
  }
  if (include.has("finance")) {
    addLine("Financeiro", { size: 12, strong: true });
    for (const entry of data.finances) addLine(`${formatCivilDate(entry.competenceDate)} | ${entry.description} | ${entry.type} | ${entry.status} | ${formatCurrency(entry.amount.toString())}`);
    y -= 8;
  }
  if (include.has("services")) {
    addLine("Serviços", { size: 12, strong: true });
    for (const item of data.serviceRanking.slice(0, 40)) addLine(`${item.name} | ${item.category} | quantidade ${item.quantity} | ${formatCurrency(item.value)}`);
    y -= 8;
  }
  if (include.has("employees")) {
    addLine("Funcionários", { size: 12, strong: true });
    for (const item of data.employeeRanking.slice(0, 40)) addLine(`${item.name}${item.active ? "" : " (inativo)"} | serviços ${item.quantity} | ordens ${item.orders} | ${formatCurrency(item.value)}`);
  }
  if (include.has("customers")) {
    y -= 8;
    addLine("Clientes e veículos", { size: 12, strong: true });
    for (const item of data.customerRanking) addLine(`${item.name} | atendimentos ${item.orders} | veículos ${item.vehicles} | ${formatCurrency(item.value)}`);
    for (const item of data.vehicleRanking) addLine(`${item.label} | atendimentos ${item.orders} | ${formatCurrency(item.value)}`);
  }
  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(`Página ${index + 1} de ${pages.length}`, { x: 470, y: 20, size: 8, font: regular }));
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
