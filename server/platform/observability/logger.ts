import { AppError } from "@/server/platform/errors/app-error";

type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;

export type LogEvent = {
  level?: LogLevel;
  event: string;
  module: string;
  requestId?: string;
  operationId?: string;
  route?: string;
  durationMs?: number;
  result?: string;
  userId?: string;
  error?: unknown;
  [key: string]: LogValue | unknown;
};

function safeError(error: unknown) {
  if (error instanceof AppError) {
    return { name: error.name, code: error.code, status: error.status };
  }
  if (error instanceof Error) return { name: error.name };
  return { name: "UnknownError" };
}
export function logEvent(input: LogEvent) {
  const { level = "info", error, ...fields } = input;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...fields,
    ...(error ? { error: safeError(error) } : {}),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
