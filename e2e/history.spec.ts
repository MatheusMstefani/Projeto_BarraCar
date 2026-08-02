import { expect, test, type Page } from "@playwright/test";
import { stat } from "node:fs/promises";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail ou usuário").fill("admin");
  await page.getByLabel("Senha").fill("Barracar@123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

async function metricValue(page: Page, label: string) {
  return compact(
    await page
      .getByText(label, { exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'rounded-xl')][1]")
      .locator(".text-xl")
      .innerText(),
  );
}

test("consulta histórico, preserva filtros e exporta PDF/CSV", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) runtimeErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/historico");
  await expect(page).toHaveURL(/\/login/);
  await login(page);

  await page.locator('button[aria-controls="sidebar-group-gestao"]').click();
  await page.locator('a[href="/historico"]').click();
  await expect(page.getByRole("heading", { name: "Histórico Geral" })).toBeVisible();

  await page.getByRole("link", { name: "Mês anterior" }).first().click();
  await expect(page).toHaveURL(/mode=month/);
  const previousPeriodUrl = new URL(page.url());
  const previousYear = Number(previousPeriodUrl.searchParams.get("year"));
  const previousMonth = Number(previousPeriodUrl.searchParams.get("month"));
  expect(previousYear).toBeGreaterThanOrEqual(1900);
  expect(previousMonth).toBeGreaterThanOrEqual(1);
  expect(previousMonth).toBeLessThanOrEqual(12);

  const filters = page.getByRole("button", { name: "Aplicar filtros" }).locator("xpath=ancestor::form");
  await filters.locator('select[name="mode"]').selectOption("month");
  await filters.locator('select[name="month"]').selectOption("7");
  await filters.locator('input[name="year"]').fill("2026");
  await filters.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/mode=month/);
  await expect(page).toHaveURL(/month=7/);
  await expect(page).toHaveURL(/year=2026/);
  await expect(page.getByText(/julho de 2026/i).first()).toBeVisible();

  const annualTable = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "Ordens" }) });
  const annualJulyCells = (
    await annualTable
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: "Julho" }) })
      .locator("td")
      .allInnerTexts()
  ).map(compact);
  expect(annualJulyCells.slice(1)).toEqual([
    await metricValue(page, "Ordens"),
    await metricValue(page, "Serviços realizados"),
    await metricValue(page, "Entradas pagas"),
    await metricValue(page, "Saídas pagas"),
    await metricValue(page, "Saldo realizado"),
    await metricValue(page, "Clientes atendidos"),
    await metricValue(page, "Veículos atendidos"),
  ]);

  const chartJulyCells = (
    await page
      .locator("table.sr-only")
      .first()
      .getByRole("row", { includeHidden: true })
      .filter({ hasText: "Jul" })
      .locator("td")
      .allInnerTexts()
  ).map(compact);
  expect(chartJulyCells.slice(1)).toEqual(annualJulyCells.slice(3, 6));

  await page.getByRole("link", { name: "Ordens de Serviço" }).last().click();
  await expect(page).toHaveURL(/tab=orders/);
  const orderLink = page.locator('table a[href^="/ordens/"]').first();
  if (await orderLink.count()) {
    await orderLink.click();
    await expect(page.getByRole("heading", { name: /OS #/ })).toBeVisible();
    await page.getByRole("link", { name: "Voltar" }).click();
    await expect(page).toHaveURL(/\/historico\?/);
    await expect(page).toHaveURL(/month=7/);
    await expect(page).toHaveURL(/tab=orders/);
  }

  for (const tab of ["Financeiro", "Serviços", "Funcionários", "Clientes e veículos", "Agendamentos", "Orçamentos", "Documentos e fotos"]) {
    await page.getByRole("link", { name: tab }).last().click();
    await expect(page).toHaveURL(/tab=/);
  }

  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar PDF" }).click();
  const downloadedPdf = await pdfDownload;
  expect(downloadedPdf.suggestedFilename()).toMatch(/historico-2026-07\.pdf/);
  await downloadedPdf.saveAs("test-results/history-report.pdf");
  expect((await stat("test-results/history-report.pdf")).size).toBeGreaterThan(100_000);
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await csvDownload).suggestedFilename()).toMatch(/historico-2026-07\.csv/);

  await page.getByRole("link", { name: "Ano anterior", exact: true }).click();
  await expect(page.getByText(/Ano de 2025/).first()).toBeVisible();
  const previousYearFilters = page
    .getByRole("button", { name: "Aplicar filtros" })
    .locator("xpath=ancestor::form");
  await expect(previousYearFilters.locator('input[name="year"]')).toHaveValue("2026");
  await previousYearFilters.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByText(/Ano de 2025/).first()).toBeVisible();
  await expect(page).toHaveURL(/mode=previousYear/);
  await expect(page).toHaveURL(/year=2026/);

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Histórico Geral" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(runtimeErrors).toEqual([]);
});
