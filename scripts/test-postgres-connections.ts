import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { normalizedDatabaseEnvironment } from "../lib/database-url";

function environmentFile(path: string) {
  const parsed: Record<string, string | undefined> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator);
    const rawValue = line.slice(separator + 1);
    try {
      parsed[name] = rawValue.startsWith('"') ? JSON.parse(rawValue) : rawValue;
    } catch {
      parsed[name] = rawValue;
    }
  }
  return parsed;
}

const fileArgument = process.argv.findIndex(
  (argument) => argument === "--env-file" || argument.startsWith("--env-file="),
);
const environmentFilePath =
  fileArgument < 0
    ? undefined
    : process.argv[fileArgument].startsWith("--env-file=")
      ? process.argv[fileArgument].slice("--env-file=".length)
      : process.argv[fileArgument + 1];
const sourceEnvironment = environmentFilePath
  ? environmentFile(environmentFilePath)
  : process.env;
const environment = normalizedDatabaseEnvironment({
  ...sourceEnvironment,
  VERCEL: "1",
});

async function authenticates(name: "DATABASE_URL" | "DIRECT_URL") {
  const configured = environment[name];
  if (!configured) return { authenticated: false, errorType: "VARIAVEL_AUSENTE" };

  let client: PrismaClientType | undefined;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const url = new URL(configured);
    url.searchParams.set("connect_timeout", "10");
    client = new PrismaClient({
      datasources: { db: { url: url.toString() } },
      log: [],
    });
    await client.$queryRawUnsafe("SELECT 1");
    return { authenticated: true };
  } catch (error) {
    const candidate = error as {
      code?: unknown;
      errorCode?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const messageCode =
      typeof candidate.message === "string"
        ? candidate.message.match(/P\d{4}/)?.[0]
        : undefined;
    const inferredCode =
      typeof candidate.message === "string" &&
      /authentication failed|credentials.+not valid/i.test(candidate.message)
        ? "P1000"
        : undefined;
    const prismaCode = [
      candidate.code,
      candidate.errorCode,
      messageCode,
      inferredCode,
    ].find(
      (value): value is string =>
        typeof value === "string" && /^P\d{4}$/.test(value),
    );
    return {
      authenticated: false,
      errorType:
        prismaCode ??
        (typeof candidate.name === "string" ? candidate.name : "ERRO_DESCONHECIDO"),
    };
  } finally {
    await client?.$disconnect().catch(() => undefined);
  }
}

async function main() {
  // O Prisma carrega `.env` a partir do diretório atual. Um diretório temporário
  // garante que este diagnóstico use apenas o ambiente entregue pela Vercel.
  process.chdir(tmpdir());
  if (process.argv.includes("--metadata")) {
    const decodedPasswords: string[] = [];
    for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
      const configured = environment[name];
      if (!configured) continue;
      const url = new URL(configured);
      decodedPasswords.push(decodeURIComponent(url.password));
      console.log(
        `${name}_META: host=${url.hostname}; porta=${url.port}; database=${url.pathname.slice(1)}; username=${decodeURIComponent(url.username)}`,
      );
    }
    console.log(
      `CREDENCIAIS_META: senhas_iguais=${decodedPasswords.length === 2 && decodedPasswords[0] === decodedPasswords[1] ? "sim" : "não"}; somente_alfanumerica=${decodedPasswords.length === 2 && decodedPasswords.every((password) => /^[A-Za-z0-9]+$/.test(password)) ? "sim" : "não"}; placeholder=${decodedPasswords.some((password) => /^(?:\[|<).*(?:password|senha).*(?:\]|>)$/i.test(password)) ? "sim" : "não"}`,
    );
  }
  if (process.argv.includes("--metadata-only")) return;
  const databaseAuthenticated = await authenticates("DATABASE_URL");
  const directAuthenticated = await authenticates("DIRECT_URL");

  console.log(
    `DATABASE_URL: ${databaseAuthenticated.authenticated ? "autenticou" : `falhou (${databaseAuthenticated.errorType})`}`,
  );
  console.log(
    `DIRECT_URL: ${directAuthenticated.authenticated ? "autenticou" : `falhou (${directAuthenticated.errorType})`}`,
  );

  if (!databaseAuthenticated.authenticated || !directAuthenticated.authenticated) {
    process.exitCode = 1;
  }
}

void main();
