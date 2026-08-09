import { tmpdir } from "node:os";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { normalizedDatabaseEnvironment } from "../lib/database-url";

const environment = normalizedDatabaseEnvironment({
  ...process.env,
  VERCEL: "1",
});

async function authenticates(name: "DATABASE_URL" | "DIRECT_URL") {
  const configured = environment[name];
  if (!configured) return false;

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
    return true;
  } catch {
    return false;
  } finally {
    await client?.$disconnect().catch(() => undefined);
  }
}

async function main() {
  // O Prisma carrega `.env` a partir do diretório atual. Um diretório temporário
  // garante que este diagnóstico use apenas o ambiente entregue pela Vercel.
  process.chdir(tmpdir());
  const databaseAuthenticated = await authenticates("DATABASE_URL");
  const directAuthenticated = await authenticates("DIRECT_URL");

  console.log(`DATABASE_URL: ${databaseAuthenticated ? "autenticou" : "falhou"}`);
  console.log(`DIRECT_URL: ${directAuthenticated ? "autenticou" : "falhou"}`);

  if (!databaseAuthenticated || !directAuthenticated) process.exitCode = 1;
}

void main();
