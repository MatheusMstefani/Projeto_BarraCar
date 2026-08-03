import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { createRequestId } from "@/server/platform/observability/request-context";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
});

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/ready|login|branding/|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)",
  ],
};
