"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCustomer } from "@/app/(private)/clientes/actions";
import { ActionMessage } from "@/components/action-message";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";

export function CustomerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createCustomer,
    INITIAL_ACTION_STATE,
  );

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card form">
      <h2>Novo cliente</h2>
      <label>
        Nome
        <input name="name" required />
      </label>
      <label>
        Telefone
        <input name="phone" required />
      </label>
      <label>
        WhatsApp
        <input name="whatsapp" required />
      </label>
      <label>
        Cidade
        <input name="city" required />
      </label>
      <ActionMessage state={state} />
      <button disabled={pending}>
        {pending ? "Salvando..." : "Salvar cliente"}
      </button>
    </form>
  );
}
