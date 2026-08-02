import Image from "next/image";
import { loginAction } from "@/app/actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login">
      <form action={loginAction} className="card form">
        <div className="grid justify-items-center gap-3 text-center">
          <Image
            src="/branding/barracar-logo.png"
            alt="Logo da Barracar Estética Automotiva"
            width={1378}
            height={689}
            priority
            unoptimized
            className="h-auto w-full max-w-[320px] object-contain"
          />
          <div>
            <h1>Barracar Gestão</h1>
            <p>Entre para acessar a operação.</p>
          </div>
        </div>
        {params.erro && <p className="error">Usuário ou senha inválidos.</p>}
        <label>
          E-mail ou usuário
          <input name="login" required autoComplete="username" />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <button>Entrar</button>
      </form>
    </main>
  );
}
