"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef } from "react";
import { ActionMessage } from "@/components/action-message";
import {
  INITIAL_ACTION_STATE,
  type ActionState,
} from "@/lib/action-state";

type FormAction = (
  previousState: ActionState,
  data: FormData,
) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Salvando...",
  resetOnSuccess = false,
  className = "card form",
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_ACTION_STATE,
  );

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      <ActionMessage state={state} />
      {submitLabel && (
        <button disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      )}
    </form>
  );
}
