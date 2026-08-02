import { expect, test, type Page } from "@playwright/test";

const admin = { login: "admin", password: "Barracar@123" };

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail ou usuário").fill(admin.login);
  await page.getByLabel("Senha").fill(admin.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/Olá,/)).toBeVisible();
}

test.describe.serial("Barracar Gestão", () => {
  test("protege rotas, rejeita credenciais inválidas e mantém a sessão", async ({ page }) => {
    await page.goto("/financeiro");
    await expect(page).toHaveURL(/\/login/);

    const unauthenticatedPhoto = await page.request.get(
      "/api/media/photos/inexistente",
      { maxRedirects: 0 },
    );
    expect([307, 401]).toContain(unauthenticatedPhoto.status());
    const unauthenticatedOptions = await page.request.get(
      "/api/work-orders/inexistente/photo-options",
      { maxRedirects: 0 },
    );
    expect([307, 401]).toContain(unauthenticatedOptions.status());

    await page.getByLabel("E-mail ou usuário").fill(admin.login);
    await page.getByLabel("Senha").fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Usuário ou senha inválidos.")).toBeVisible();

    await signIn(page);
    await page.reload();
    await expect(page.getByText(/Olá,/)).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/ordens");
    await expect(page).toHaveURL(/\/login/);
  });

  test("abre os módulos principais sem erros de página, console ou rede", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) errors.push(`${response.status()}: ${response.url()}`);
    });

    await signIn(page);
    for (const [path, heading] of [
      ["/", /Olá,/],
      ["/clientes", "Clientes"],
      ["/veiculos", "Veículos"],
      ["/funcionarios", "Funcionários"],
      ["/servicos", "Serviços"],
      ["/ordens", "Ordens de Serviço"],
      ["/agenda", "Agenda"],
      ["/financeiro", "Financeiro"],
      ["/configuracoes", "Configurações"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
