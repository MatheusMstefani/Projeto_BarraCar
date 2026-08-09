import { spawnSync } from "node:child_process";
import { normalizedDatabaseEnvironment } from "../lib/database-url";

const environment = normalizedDatabaseEnvironment(process.env);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const steps: Array<[string, string[]]> = [
  [npm, ["run", "verify:deployment-env"]],
  [npx, ["prisma", "generate"]],
  [npx, ["prisma", "migrate", "deploy"]],
  [npx, ["prisma", "db", "seed"]],
  [npm, ["run", "provision:storage"]],
  [npx, ["next", "build"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`Não foi possível executar ${command}.`);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
