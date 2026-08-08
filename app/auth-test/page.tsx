import { logoutAction } from "@/app/actions";
import { getSupabaseIdentity } from "@/lib/supabase/identity";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Página temporária de diagnóstico: não acessa Prisma nem serviços de negócio. */
export default async function AuthTestPage() {
  const identity = await getSupabaseIdentity();
  if (!identity) redirect("/login");

  return (
    <main className="login">
      <section className="card form" aria-labelledby="auth-test-title">
        <div>
          <p className="success">Diagnóstico de autenticação</p>
          <h1 id="auth-test-title">Autenticação Supabase funcionando</h1>
        </div>
        <dl className="grid gap-3">
          <div>
            <dt className="text-label-sm text-on-surface-variant">E-mail</dt>
            <dd className="break-all">{identity.email ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">User ID</dt>
            <dd className="break-all">{identity.id}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Ambiente</dt>
            <dd>{process.env.NODE_ENV === "production" ? "Production" : "Development"}</dd>
          </div>
        </dl>
        <form action={logoutAction}>
          <button type="submit">Sair</button>
        </form>
      </section>
    </main>
  );
}
