const projectRef = "pngqojulpvankaijcuqa";
const expectedSupabaseUrl = `https://${projectRef}.supabase.co`;
const failures: string[] = [];

function configured(name: string) {
  const value = process.env[name]?.trim();
  if (!value || /^\[(?:encrypted|redacted)\]$/i.test(value)) {
    failures.push(`${name}: ausente ou indisponível`);
    return null;
  }
  return value;
}

function postgresUrl(name: "DATABASE_URL" | "DIRECT_URL", expectedPort: string) {
  const value = configured(name);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      failures.push(`${name}: protocolo inválido`);
    }
    if (url.port !== expectedPort) failures.push(`${name}: porta inválida`);
    if (!value.includes(projectRef)) failures.push(`${name}: projeto incorreto`);
    return url;
  } catch {
    failures.push(`${name}: formato inválido`);
    return null;
  }
}

const databaseUrl = postgresUrl("DATABASE_URL", "6543");
postgresUrl("DIRECT_URL", "5432");
if (databaseUrl) {
  if (databaseUrl.searchParams.get("pgbouncer") !== "true") {
    failures.push("DATABASE_URL: pgbouncer=true ausente");
  }
  if (databaseUrl.searchParams.get("connection_limit") !== "1") {
    failures.push("DATABASE_URL: connection_limit=1 ausente");
  }
}

if (configured("NEXT_PUBLIC_SUPABASE_URL") !== expectedSupabaseUrl) {
  failures.push("NEXT_PUBLIC_SUPABASE_URL: projeto incorreto");
}
configured("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
configured("SUPABASE_SECRET_KEY");

if (configured("STORAGE_PROVIDER") !== "supabase") {
  failures.push("STORAGE_PROVIDER: deve ser supabase");
}
if (configured("SUPABASE_STORAGE_BUCKET") !== "barracar-private") {
  failures.push("SUPABASE_STORAGE_BUCKET: bucket incorreto");
}
if (configured("SEED_ADMIN_EMAIL")?.toLowerCase() !== "admin@barracar.com") {
  failures.push("SEED_ADMIN_EMAIL: administrador incorreto");
}

if (failures.length) {
  console.error("Ambiente de deployment inválido:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Ambiente de deployment validado sem expor valores.");
}
