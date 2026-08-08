import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "./config";

type CookieUpdate = { name: string; value: string; options: CookieOptions };

export async function refreshSupabaseSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) {
    return { authenticated: false, cookieUpdates: [] as CookieUpdate[], cacheHeaders: {} };
  }

  let cookieUpdates: CookieUpdate[] = [];
  let cacheHeaders: Record<string, string> = {};
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookieUpdates = cookiesToSet;
        cacheHeaders = headers;
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  return {
    authenticated: !error && Boolean(data?.claims.sub),
    cookieUpdates,
    cacheHeaders,
  };
}

export function applySupabaseSession(
  response: NextResponse,
  session: Awaited<ReturnType<typeof refreshSupabaseSession>>,
) {
  session.cookieUpdates.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  Object.entries(session.cacheHeaders).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}
