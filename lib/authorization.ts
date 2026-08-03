import { redirect } from "next/navigation";
import {
  hasCapability,
  type Capability,
} from "@/server/platform/auth/capabilities";
import { getActor } from "@/server/platform/auth/actor";

/** Rotas cujo conteúdo só pode ser visto por ADMIN (regra: "ADMIN gerencia tudo; EMPLOYEE acessa dashboard e execução autorizada"). */
export const ADMIN_ONLY_ROUTES = new Set([
  "/financeiro",
  "/funcionarios",
  "/historico",
  "/configuracoes",
]);

/** Garante papel ADMIN na renderização de páginas restritas; redireciona os demais ao dashboard. */
export async function requireAdminPage(
  capability: Capability = "admin:access",
) {
  const actor = await getActor();
  if (!actor || !hasCapability(actor, capability)) redirect("/");
  return actor;
}
