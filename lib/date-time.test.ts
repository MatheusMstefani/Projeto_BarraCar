import { describe, expect, it } from "vitest";
import {
  formatCivilDate,
  getCivilDateInputValue,
  getDashboardDateBoundaries,
  parseCivilDate,
} from "./date-time";

describe("datas civis e limites por fuso", () => {
  it("não desloca uma data civil para o dia anterior", () => {
    const value = parseCivilDate("2026-07-20");

    expect(value.toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(formatCivilDate(value)).toBe("20/07/2026");
  });

  it("usa o dia local de APP_TIMEZONE nos formulários", () => {
    const justBeforeMidnightInSaoPaulo = new Date("2026-07-20T02:30:00.000Z");

    expect(
      getCivilDateInputValue(
        justBeforeMidnightInSaoPaulo,
        "America/Sao_Paulo",
      ),
    ).toBe("2026-07-19");
  });

  it("calcula início do dia operacional e do mês financeiro corretamente", () => {
    const now = new Date("2026-07-20T02:30:00.000Z");
    const boundaries = getDashboardDateBoundaries(now, "America/Sao_Paulo");

    expect(boundaries.appointmentsFrom.toISOString()).toBe(
      "2026-07-19T03:00:00.000Z",
    );
    expect(boundaries.financialMonthFrom.toISOString()).toBe(
      "2026-07-01T00:00:00.000Z",
    );
    expect(boundaries.financialNextMonthFrom.toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("avança corretamente o limite financeiro no fim do ano", () => {
    const boundaries = getDashboardDateBoundaries(
      new Date("2026-12-20T15:00:00.000Z"),
      "America/Sao_Paulo",
    );

    expect(boundaries.financialNextMonthFrom.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("rejeita datas civis inexistentes", () => {
    expect(() => parseCivilDate("2026-02-30")).toThrow("Data civil inválida");
  });
});
