import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase Auth não configurado");
  return createBrowserClient(config.url, config.publishableKey);
}
