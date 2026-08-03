import { describe, expect, it } from "vitest";
import { DomainError } from "./app-error";
import { toProblemDetails } from "./problem-details";

describe("Problem Details", () => {
  it("preserva somente dados seguros de erros conhecidos", () => {
    expect(
      toProblemDetails(
        new DomainError("Revise o valor.", "INVALID_VALUE", { amount: "Inválido" }),
        "req-test",
      ),
    ).toEqual({
      code: "INVALID_VALUE",
      title: "Não foi possível concluir a operação",
      status: 422,
      detail: "Revise o valor.",
      requestId: "req-test",
      fields: { amount: "Inválido" },
    });
  });

  it("não expõe mensagem de erro interno", () => {
    const problem = toProblemDetails(new Error("senha=segredo"), "req-test");
    expect(problem.detail).not.toContain("segredo");
    expect(problem.code).toBe("INTERNAL_ERROR");
  });
});
