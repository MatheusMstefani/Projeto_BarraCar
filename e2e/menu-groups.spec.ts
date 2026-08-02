import { expect, test, type Locator, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail ou usuário").fill("admin");
  await page.getByLabel("Senha").fill("Barracar@123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function groupButton(page: Page, key: string): Locator {
  return page.locator(`button[aria-controls="sidebar-group-${key}"]`);
}

test("grupos da sidebar abrem e fecham de forma independente", async ({ page }) => {
  await login(page);
  await expect(page.locator("aside:visible")).toHaveCount(1);
  expect((await page.locator("aside:visible").boundingBox())?.x).toBe(0);
  await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(1);

  const operation = groupButton(page, "operacao");
  const registrations = groupButton(page, "cadastros");
  const management = groupButton(page, "gestao");

  await expect(operation).toHaveAttribute("aria-expanded", "true");
  await expect(registrations).toHaveAttribute("aria-expanded", "false");
  await expect(management).toHaveAttribute("aria-expanded", "false");

  await registrations.focus();
  await page.keyboard.press("Enter");
  await expect(registrations).toHaveAttribute("aria-expanded", "true");
  await expect(operation).toHaveAttribute("aria-expanded", "true");

  await management.focus();
  await page.keyboard.press("Space");
  await expect(management).toHaveAttribute("aria-expanded", "true");
  await expect(registrations).toHaveAttribute("aria-expanded", "true");
  await expect(operation).toHaveAttribute("aria-expanded", "true");

  await expect(
    management.locator(".material-symbols-outlined").last(),
  ).toHaveClass(/rotate-180/);

  await page.locator('a[href="/financeiro"]').click();
  await expect(page).toHaveURL(/\/financeiro$/);
  await expect(groupButton(page, "operacao")).toHaveAttribute("aria-expanded", "true");
  await expect(groupButton(page, "cadastros")).toHaveAttribute("aria-expanded", "true");
  await expect(groupButton(page, "gestao")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('a[href="/financeiro"]')).toHaveClass(/text-primary/);

  await page.locator('a[href="/historico"]').click();
  await expect(page).toHaveURL(/\/historico$/);
  await expect(groupButton(page, "operacao")).toHaveAttribute("aria-expanded", "true");
  await expect(groupButton(page, "cadastros")).toHaveAttribute("aria-expanded", "true");
  await expect(groupButton(page, "gestao")).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Histórico", exact: true }),
  ).toHaveClass(/text-primary/);

  await groupButton(page, "cadastros").click();
  await expect(groupButton(page, "cadastros")).toHaveAttribute("aria-expanded", "false");
  await expect(groupButton(page, "operacao")).toHaveAttribute("aria-expanded", "true");
  await expect(groupButton(page, "gestao")).toHaveAttribute("aria-expanded", "true");
});
