import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Rotas cujo conteúdo só pode ser visto por ADMIN (regra: "ADMIN gerencia tudo; EMPLOYEE acessa dashboard e execução autorizada"). */
export const ADMIN_ONLY_ROUTES = new Set([
  "/financeiro",
  "/funcionarios",
  "/historico",
  "/configuracoes",
]);

/** Garante papel ADMIN na renderização de páginas restritas; redireciona os demais ao dashboard. */
export async function requireAdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");
  return session;
}
