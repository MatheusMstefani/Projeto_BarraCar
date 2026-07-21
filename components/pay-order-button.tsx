"use client";

import { useActionState } from "react";
import { payOrder } from "@/app/(private)/ordens/actions";
import { ActionMessage } from "@/components/action-message";
import { INITIAL_ACTION_STATE } from "@/lib/action-state";

export function PayOrderButton({ workOrderId }: { workOrderId: string }) {
  const [state, formAction, pending] = useActionState(
    payOrder,
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="id" value={workOrderId} />
      <button disabled={pending}>
        {pending ? "Registrando..." : "Marcar paga"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}
