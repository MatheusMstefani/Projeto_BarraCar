import "server-only";

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { ActionState } from "@/lib/action-state";
import { DomainError } from "@/lib/errors";

export function actionFailure(error: unknown, fallback: string): ActionState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Revise os campos informados.",
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      status: "error",
      message: "Já existe um cadastro com esses dados.",
    };
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return { status: "error", message: "O registro não foi encontrado." };
  }

  if (error instanceof DomainError && error.message) {
    return { status: "error", message: error.message };
  }

  // Qualquer outro erro é interno (conexão, bug, infraestrutura): a mensagem
  // real não deve chegar ao usuário.
  return { status: "error", message: fallback };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}
