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
  return normalized as NodeJS.ProcessEnv;
}

export function applyNormalizedDatabaseEnvironment() {
  for (const name of DATABASE_VARIABLES) {
    const value = normalizeDatabaseUrlValue(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
