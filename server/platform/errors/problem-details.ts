import { NextResponse } from "next/server";
import { AppError } from "./app-error";
import { createRequestId } from "@/server/platform/observability/request-context";

export type ProblemDetails = {
  code: string;
  title: string;
  status: number;
  detail: string;
  requestId: string;
  fields?: Record<string, string>;
};

export function toProblemDetails(
  error: unknown,
  requestId = createRequestId(),
): ProblemDetails {
  if (error instanceof AppError) {
    return {
      code: error.code,
      title: error.title,
      status: error.status,
      detail: error.detail,
      requestId,
      ...(error.fields ? { fields: error.fields } : {}),
    };
  }

  return {
    code: "INTERNAL_ERROR",
    title: "Erro interno",
    status: 500,
    detail: "Não foi possível concluir a operação.",
    requestId,
  };
}
export function problemResponse(error: unknown, requestId?: string) {
  const problem = toProblemDetails(error, requestId);
  return NextResponse.json(problem, {
    status: problem.status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Request-Id": problem.requestId,
    },
  });
}
