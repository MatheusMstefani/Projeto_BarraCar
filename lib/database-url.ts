const DATABASE_VARIABLES = ["DATABASE_URL", "DIRECT_URL"] as const;

type DatabaseVariable = (typeof DATABASE_VARIABLES)[number];

export function normalizeDatabaseUrlValue(
  name: DatabaseVariable,
  rawValue: string | undefined,
) {
  if (!rawValue) return rawValue;
  let value = rawValue.trim();
  value = value.replace(new RegExp(`^${name}\\s*=\\s*`, "i"), "").trim();

  const first = value.at(0);
  const last = value.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function normalizedDatabaseEnvironment(
  environment: Record<string, string | undefined> = process.env,
) {
  const normalized = { ...environment };
  for (const name of DATABASE_VARIABLES) {
    normalized[name] = normalizeDatabaseUrlValue(name, environment[name]);
  }
  if (environment.VERCEL) {
    const projectRef = environment.NEXT_PUBLIC_SUPABASE_URL?.match(
      /^https:\/\/([^.]+)\.supabase\.co\/?$/i,
    )?.[1];
    for (const name of DATABASE_VARIABLES) {
      if (!normalized[name]) continue;
      const url = new URL(normalized[name]);
      if (
        projectRef &&
        url.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(url.username) === "postgres"
      ) {
        url.username = `postgres.${projectRef}`;
      }
      if (name === "DATABASE_URL") {
        url.searchParams.set("pgbouncer", "true");
        url.searchParams.set("connection_limit", "1");
      }
      normalized[name] = url.toString();
    }
  }
  return normalized as NodeJS.ProcessEnv;
}

export function applyNormalizedDatabaseEnvironment() {
  const normalized = normalizedDatabaseEnvironment(process.env);
  for (const name of DATABASE_VARIABLES) {
    const value = normalized[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
