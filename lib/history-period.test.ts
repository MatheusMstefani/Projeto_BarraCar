import { describe, expect, it } from "vitest";
import { historyPeriodFormYear, resolveHistoryPeriod } from "./history-period";

describe("intervalos do histórico", () => {
  it("converte mês de São Paulo para limite UTC final exclusivo", () => {
    const period = resolveHistoryPeriod(
      { mode: "month", year: "2026", month: "7" },
      new Date("2026-08-10T12:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(period.instantFrom?.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(period.instantTo?.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(period.civilFrom?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(period.civilTo?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(period.toValue).toBe("2026-07-31");
  });

  it("aceita período personalizado invertido e inclui os dois dias", () => {
    const period = resolveHistoryPeriod(
      { mode: "custom", from: "2026-08-01", to: "2026-07-31" },
      new Date("2026-08-10T12:00:00Z"),
    );
    expect(period.fromValue).toBe("2026-07-31");
    expect(period.toValue).toBe("2026-08-01");
    expect(period.instantTo?.toISOString()).toBe("2026-08-02T03:00:00.000Z");
  });

  it("trata datas civis inválidas sem derrubar uma URL editada manualmente", () => {
    const period = resolveHistoryPeriod(
      { mode: "custom", from: "2026-02-31", to: "2026-03-01" },
      new Date("2026-08-10T12:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(period.fromValue).toBe("2026-03-01");
    expect(period.toValue).toBe("2026-03-01");
    expect(period.instantFrom?.toISOString()).toBe("2026-03-01T03:00:00.000Z");
    expect(period.instantTo?.toISOString()).toBe("2026-03-02T03:00:00.000Z");
  });

  it("consulta outro ano e todo o período", () => {
    const year = resolveHistoryPeriod(
      { mode: "year", year: "2024", month: "8" },
      new Date("2026-08-02T12:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(year.label).toBe("Ano de 2024");
    expect(year.instantFrom?.toISOString()).toBe("2024-01-01T03:00:00.000Z");
    expect(year.instantTo?.toISOString()).toBe("2025-01-01T03:00:00.000Z");
    expect(year.civilFrom?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(year.civilTo?.toISOString()).toBe("2025-01-01T00:00:00.000Z");

    const previousYear = resolveHistoryPeriod(
      { mode: "previousYear", year: "2026", month: "12" },
      new Date("2026-08-02T12:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(previousYear.year).toBe(2025);
    expect(previousYear.instantFrom?.toISOString()).toBe("2025-01-01T03:00:00.000Z");
    expect(previousYear.instantTo?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(historyPeriodFormYear(previousYear)).toBe(2026);
    const previousYearRoundTrip = resolveHistoryPeriod(
      {
        mode: previousYear.mode,
        year: String(historyPeriodFormYear(previousYear)),
        month: String(previousYear.month),
      },
      new Date("2026-08-02T12:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(previousYearRoundTrip.year).toBe(previousYear.year);
    expect(previousYearRoundTrip.instantFrom?.toISOString()).toBe(
      previousYear.instantFrom?.toISOString(),
    );
    expect(previousYearRoundTrip.instantTo?.toISOString()).toBe(
      previousYear.instantTo?.toISOString(),
    );

    const all = resolveHistoryPeriod({ mode: "all" });
    expect(all.instantFrom).toBeNull();
    expect(all.civilTo).toBeNull();
  });

  it("mantém janeiro e dezembro dentro do ano e exclui a virada seguinte", () => {
    const january = resolveHistoryPeriod(
      { mode: "month", year: "2026", month: "1" },
      new Date("2026-08-02T12:00:00Z"),
      "America/Sao_Paulo",
    );
    const december = resolveHistoryPeriod(
      { mode: "month", year: "2026", month: "12" },
      new Date("2026-08-02T12:00:00Z"),
      "America/Sao_Paulo",
    );

    expect(january.instantFrom?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(january.instantTo?.toISOString()).toBe("2026-02-01T03:00:00.000Z");
    expect(december.instantFrom?.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(december.instantTo?.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("normaliza os últimos 3 e 6 meses para o mês atual mesmo com URL antiga", () => {
    const now = new Date("2026-08-10T12:00:00Z");
    const lastThree = resolveHistoryPeriod(
      { mode: "last3", year: "2024", month: "5" },
      now,
      "America/Sao_Paulo",
    );
    const lastSix = resolveHistoryPeriod(
      { mode: "last6", year: "2024", month: "5" },
      now,
      "America/Sao_Paulo",
    );

    expect(lastThree).toMatchObject({
      year: 2026,
      month: 8,
      fromValue: "2026-06-01",
      toValue: "2026-08-31",
    });
    expect(lastSix).toMatchObject({
      year: 2026,
      month: 8,
      fromValue: "2026-03-01",
      toValue: "2026-08-31",
    });
  });
});
