import { expect, test } from "@playwright/test";

test("login e navegação mobile não extrapolam a viewport", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.getByLabel("E-mail ou usuário").fill("admin");
  await page.getByLabel("Senha").fill("Barracar@123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByText("Console de Gestão")).toBeVisible();
  const operation = page.locator('button[aria-controls="sidebar-group-operacao"]').last();
  const registrations = page.locator('button[aria-controls="sidebar-group-cadastros"]').last();
  const management = page.locator('button[aria-controls="sidebar-group-gestao"]').last();
  await registrations.click();
  await management.click();
  await expect(operation).toHaveAttribute("aria-expanded", "true");
  await expect(registrations).toHaveAttribute("aria-expanded", "true");
  await expect(management).toHaveAttribute("aria-expanded", "true");

  await page.locator('a[href="/financeiro"]').last().click();
  await expect(page).toHaveURL(/\/financeiro$/);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.locator('button[aria-controls="sidebar-group-operacao"]').last()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator('button[aria-controls="sidebar-group-cadastros"]').last()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator('button[aria-controls="sidebar-group-gestao"]').last()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
