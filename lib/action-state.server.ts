import "server-only";

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { ActionState } from "@/lib/action-state";
import { DomainError } from "@/lib/errors";
import { createRequestId } from "@/server/platform/observability/request-context";
import { logEvent } from "@/server/platform/observability/logger";

export function actionFailure(error: unknown, fallback: string): ActionState {
  const requestId = createRequestId();
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues
        .filter((issue) => issue.path.length > 0)
        .map((issue) => [String(issue.path[0]), issue.message]),
    );
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Revise os campos informados.",
      code: "VALIDATION_ERROR",
      requestId,
      ...(Object.keys(fields).length ? { fields } : {}),
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      status: "error",
      message: "Já existe um cadastro com esses dados.",
      code: "DUPLICATE_RECORD",
      requestId,
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return {
      status: "error",
      message: "O registro não foi encontrado.",
      code: "RECORD_NOT_FOUND",
      requestId,
    };
  }

  if (error instanceof DomainError && error.message) {
    return {
      status: "error",
      message: error.message,
      code: error.code,
      requestId,
      ...(error.fields ? { fields: error.fields } : {}),
    };
  }

  // Qualquer outro erro é interno (conexão, bug, infraestrutura): a mensagem
  // real não deve chegar ao usuário.
  logEvent({
    level: "error",
    event: "server_action_failed",
    module: "server-action",
    requestId,
    result: "error",
    error,
  });
  return {
    status: "error",
    message: fallback,
    code: "INTERNAL_ERROR",
    requestId,
  };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}
