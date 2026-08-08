import { createClient } from "./server";

export type SupabaseIdentity = {
  id: string;
  email: string | null;
};

export function identityFromClaims(claims: { sub?: unknown; email?: unknown }) {
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  } satisfies SupabaseIdentity;
}

export async function getSupabaseIdentity(): Promise<SupabaseIdentity | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return identityFromClaims(data.claims);
}
