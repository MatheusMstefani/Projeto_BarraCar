import { expect, test } from "@playwright/test";

test("login e navegação mobile não extrapolam a viewport", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.getByLabel("E-mail ou usuário").fill("admin");
  await page.getByLabel("Senha").fill("Barracar@123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("aside:visible")).toHaveCount(1);
  const logo = page.getByRole("img", {
    name: "Logo da Barracar Estética Automotiva",
  });
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate((image: HTMLImageElement) => image.naturalWidth / image.naturalHeight),
  ).toBeCloseTo(1536 / 1024, 5);
  await expect(page.getByRole("button", { name: "Fechar menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("aside:visible")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByText("Console de Gestão")).toBeVisible();
  const operation = page.locator('button[aria-controls="sidebar-group-operacao"]');
  const registrations = page.locator('button[aria-controls="sidebar-group-cadastros"]');
  const management = page.locator('button[aria-controls="sidebar-group-gestao"]');
  await registrations.click();
  await management.click();
  await expect(operation).toHaveAttribute("aria-expanded", "true");
  await expect(registrations).toHaveAttribute("aria-expanded", "true");
  await expect(management).toHaveAttribute("aria-expanded", "true");

  await page.locator('a[href="/financeiro"]').click();
  await expect(page).toHaveURL(/\/financeiro$/);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("aside:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.locator('button[aria-controls="sidebar-group-operacao"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator('button[aria-controls="sidebar-group-cadastros"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator('button[aria-controls="sidebar-group-gestao"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator("aside:visible")).toHaveCount(1);
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("aside:visible")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
