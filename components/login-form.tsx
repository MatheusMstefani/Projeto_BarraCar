"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email) return setError("Preencha o e-mail.");
    if (!password) return setError("Preencha a senha.");

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <p className="error" role="alert">{error}</p>}
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="email" disabled={pending} />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={pending}
        />
      </label>
      <button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
