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
    if (
      url.hostname.endsWith(".pooler.supabase.com") &&
      decodeURIComponent(url.username) !== `postgres.${projectRef}`
    ) {
      failures.push(`${name}: usuário do pooler incorreto`);
    }
    try {
      const password = decodeURIComponent(url.password);
      if (!password) failures.push(`${name}: senha ausente`);
      if (/^\[(?:your[-_ ]?)?password\]$/i.test(password)) {
        failures.push(`${name}: substitua o marcador pela senha real do banco`);
      }
    } catch {
      failures.push(`${name}: codificação inválida na senha`);
    }
    return url;
  } catch {
    const hints: string[] = [];
    if (/^(?:DATABASE_URL|DIRECT_URL)\s*=/i.test(value)) {
      hints.push("remova o nome da variável e mantenha somente o valor");
    }
    if (/^["']|["']$/.test(value)) {
      hints.push("remova as aspas externas");
    }
    if (!/^postgres(?:ql)?:\/\//i.test(value)) {
      hints.push("o valor deve começar com postgresql://");
    }
    failures.push(
      `${name}: formato inválido${hints.length ? ` (${hints.join("; ")})` : " (verifique caracteres especiais não codificados na senha)"}`,
    );
    return null;
  }
}

const databaseUrl = postgresUrl("DATABASE_URL", "6543");
const directUrl = postgresUrl("DIRECT_URL", "5432");
if (databaseUrl) {
  if (databaseUrl.searchParams.get("pgbouncer") !== "true") {
    failures.push("DATABASE_URL: pgbouncer=true ausente");
  }
  if (databaseUrl.searchParams.get("connection_limit") !== "1") {
    failures.push("DATABASE_URL: connection_limit=1 ausente");
  }
}
if (databaseUrl && directUrl && databaseUrl.password !== directUrl.password) {
  failures.push("DATABASE_URL e DIRECT_URL: as senhas configuradas são diferentes");
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
