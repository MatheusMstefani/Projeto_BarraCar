import type { ActionState } from "@/lib/action-state";

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;

  return (
    <p
      className={state.status === "error" ? "error" : "success"}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}
