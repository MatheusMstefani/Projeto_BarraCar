import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { privateStorage } from "@/lib/storage";
import { logEvent } from "@/server/platform/observability/logger";
import { requestIdFromHeaders } from "@/server/platform/observability/request-context";

export const dynamic = "force-dynamic";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFromHeaders(request.headers);
  const checks = await Promise.allSettled([
    withTimeout(db.$queryRaw`SELECT 1`, 2_000),
    withTimeout(
      privateStorage.healthCheck
        ? privateStorage.healthCheck()
        : Promise.reject(new Error("Storage health check unavailable")),
      2_000,
    ),
  ]);
  const database = checks[0].status === "fulfilled" ? "ok" : "error";
  const storage = checks[1].status === "fulfilled" ? "ok" : "error";
  const ready = database === "ok" && storage === "ok";

  logEvent({
    level: ready ? "info" : "warn",
    event: "readiness_checked",
    module: "platform",
    route: "/api/ready",
    requestId,
    durationMs: Date.now() - startedAt,
    result: ready ? "ready" : "not_ready",
  });

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: { database, storage },
      requestId,
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}
