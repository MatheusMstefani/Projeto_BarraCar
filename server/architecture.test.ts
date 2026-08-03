import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested: string[][] = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(target)
        : Promise.resolve(entry.name.endsWith(".ts") ? [target] : []);
    }),
  );
  return nested.flat();
}

describe("limites do monólito modular", () => {
  it("mantém application do Histórico independente de Next, Prisma e app", async () => {
    const directory = path.join(
      process.cwd(),
      "server",
      "modules",
      "history",
      "application",
    );
    for (const file of await sourceFiles(directory)) {
      const source = await readFile(file, "utf8");
      expect(source, file).not.toMatch(/from ["'](?:next|@prisma|@\/app)/);
    }
  });

  it("expõe o módulo por public.ts nas bordas migradas", async () => {
    const page = await readFile(
      path.join(process.cwd(), "app", "(private)", "historico", "page.tsx"),
      "utf8",
    );
    const route = await readFile(
      path.join(process.cwd(), "app", "api", "history", "export", "route.ts"),
      "utf8",
    );
    expect(page).toContain("@/server/modules/history/public");
    expect(route).toContain("@/server/modules/history/public");
    expect(`${page}\n${route}`).not.toContain("modules/history/adapters");
  });
});
