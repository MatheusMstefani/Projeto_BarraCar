export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  code?: string;
  requestId?: string;
  fields?: Record<string, string>;
};

export const INITIAL_ACTION_STATE: ActionState = {
  status: "idle",
  message: "",
};
