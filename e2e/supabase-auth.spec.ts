import { expect, test } from "@playwright/test";
import {
  hasSupabaseTestCredentials,
  signInToSupabase,
  supabaseTestEmail,
} from "./supabase-auth";

test("login renderiza, valida campos e protege /auth-test sem sessão", async ({ page }) => {
  await page.goto("/auth-test");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("img", { name: /Logo da Barracar/ })).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await expect(page.getByText(/Cadastrar|Criar conta|Recuperar senha/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("p[role='alert']")).toHaveText("Preencha o e-mail.");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@barracar.local");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("p[role='alert']")).toHaveText("Preencha a senha.");
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
]) {
  test(`login permanece responsivo em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole("img", { name: /Logo da Barracar/ })).toBeVisible();
  });
}

test("sessão Supabase persiste e logout encerra o acesso", async ({ page }) => {
  test.skip(!hasSupabaseTestCredentials, "Defina SUPABASE_TEST_EMAIL e SUPABASE_TEST_PASSWORD.");
  await signInToSupabase(page);
  await expect(page.getByRole("heading", { name: "Autenticação Supabase funcionando" })).toBeVisible();
  await expect(page.getByText(supabaseTestEmail, { exact: true })).toBeVisible();
  await expect(page.getByText("User ID", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/auth-test$/);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/auth-test");
  await expect(page).toHaveURL(/\/login$/);
});
