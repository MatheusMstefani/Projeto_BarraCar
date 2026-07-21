"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PrivateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="card form" role="alert">
      <h1>Não foi possível concluir esta operação</h1>
      <p>
        Seus dados continuam seguros. Tente novamente e, se o problema
        persistir, informe o suporte.
      </p>
      <div className="actions">
        <button type="button" onClick={reset}>
          Tentar novamente
        </button>
        <Link className="button" href="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
