import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await auth()) redirect("/");

  return (
    <main className="login">
      <div className="card form">
        <div className="grid justify-items-center gap-3 text-center">
          <Image
            src="/branding/barracar-logo.png"
            alt="Logo da Barracar Estética Automotiva"
            width={1536}
            height={1024}
            priority
            unoptimized
            className="brand-logo brand-logo-login h-auto w-full max-w-[320px] object-contain"
          />
          <div>
            <h1>Barracar Gestão</h1>
            <p>Entre para acessar a operação.</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
