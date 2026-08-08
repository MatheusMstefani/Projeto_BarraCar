import { expect, type Page } from "@playwright/test";

export const supabaseTestEmail = process.env.SUPABASE_TEST_EMAIL ?? "";
export const supabaseTestPassword = process.env.SUPABASE_TEST_PASSWORD ?? "";
export const hasSupabaseTestCredentials = Boolean(
  supabaseTestEmail && supabaseTestPassword,
);

export async function signInToSupabase(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(supabaseTestEmail);
  await page.getByLabel("Senha", { exact: true }).fill(supabaseTestPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/auth-test$/);
}

export async function signInToBarracar(page: Page) {
  await signInToSupabase(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
}
