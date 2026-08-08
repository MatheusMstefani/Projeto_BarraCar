import { NextResponse, type NextRequest } from "next/server";
import { applySupabaseSession, refreshSupabaseSession } from "@/lib/supabase/middleware";
import { getAuthRedirectPath } from "@/lib/supabase/route-policy";
import { createRequestId } from "@/server/platform/observability/request-context";

export default async function middleware(request: NextRequest) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const session = await refreshSupabaseSession(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const redirectPath = getAuthRedirectPath(request.nextUrl.pathname, session.authenticated);
  const response = redirectPath
    ? NextResponse.redirect(new URL(redirectPath, request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return applySupabaseSession(response, session);
}

export const config = {
  matcher: [
    "/((?!api/health|api/ready|branding/|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)",
  ],
};
