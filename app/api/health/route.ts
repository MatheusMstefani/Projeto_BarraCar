import { NextRequest, NextResponse } from "next/server";
import { requestIdFromHeaders } from "@/server/platform/observability/request-context";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const requestId = requestIdFromHeaders(request.headers);
  return NextResponse.json(
    {
      status: "ok",
      service: "barracar-gestao",
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}
