import { describe, expect, it } from "vitest";
import {
  normalizeDatabaseUrlValue,
  normalizedDatabaseEnvironment,
} from "./database-url";

describe("normalização segura das URLs PostgreSQL", () => {
  it("preserva uma URL já válida", () => {
    const url = "postgresql://user:password@localhost:5432/database";
    expect(normalizeDatabaseUrlValue("DATABASE_URL", url)).toBe(url);
  });

  it("corrige uma linha completa colada na Vercel", () => {
    expect(
      normalizeDatabaseUrlValue(
        "DATABASE_URL",
        'DATABASE_URL="postgresql://user:password@host:6543/database"',
      ),
    ).toBe("postgresql://user:password@host:6543/database");
  });

  it("normaliza somente as variáveis PostgreSQL", () => {
    const environment = normalizedDatabaseEnvironment({
      DATABASE_URL: "DATABASE_URL='postgresql://runtime'",
      DIRECT_URL: 'DIRECT_URL="postgresql://migration"',
      SUPABASE_SECRET_KEY: "preservada",
    });
    expect(environment).toMatchObject({
      DATABASE_URL: "postgresql://runtime",
      DIRECT_URL: "postgresql://migration",
      SUPABASE_SECRET_KEY: "preservada",
    });
  });
});
