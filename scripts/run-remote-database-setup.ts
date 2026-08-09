import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
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

function failureType(result: ReturnType<typeof spawnSync>) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return output.match(/P\d{4}/)?.[0] ?? (result.error ? "PROCESS_ERROR" : "COMMAND_ERROR");
}

const envFile = process.argv[2];
if (!envFile) throw new Error("Informe o arquivo de ambiente remoto.");

const projectRoot = resolve(__dirname, "..");
const environment = normalizedDatabaseEnvironment({
  ...environmentFile(resolve(projectRoot, envFile)),
  SEED_ADMIN_EMAIL: "admin@barracar.com",
  VERCEL: "1",
});
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schema = join(projectRoot, "prisma", "schema.prisma");
const tsxCli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const seed = join(projectRoot, "prisma", "seed.ts");

function run(command: string, args: string[]) {
  return spawnSync(command, args, {
    cwd: tmpdir(),
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const migration = run(process.execPath, [
  prismaCli,
  "migrate",
  "deploy",
  "--schema",
  schema,
]);
if (migration.status !== 0 || migration.error) {
  console.log(`MIGRATE_DEPLOY: falhou (${failureType(migration)})`);
  process.exit(1);
}
console.log("MIGRATE_DEPLOY: concluído");

for (let execution = 1; execution <= 2; execution += 1) {
  const seeded = run(process.execPath, [tsxCli, seed]);
  if (seeded.status !== 0 || seeded.error) {
    console.log(`SEED_${execution}: falhou (${failureType(seeded)})`);
    process.exit(1);
  }
  console.log(`SEED_${execution}: concluído`);
}
