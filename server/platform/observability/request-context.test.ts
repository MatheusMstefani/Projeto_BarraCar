import { describe, expect, it } from "vitest";
import { createRequestId } from "./request-context";

describe("request id", () => {
  it("preserva um identificador válido recebido", () => {
    expect(createRequestId("req-client_123")).toBe("req-client_123");
  });

  it("substitui valores inválidos", () => {
    expect(createRequestId("valor com espaço")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
