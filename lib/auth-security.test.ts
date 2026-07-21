import { describe, expect, it } from "vitest";
import { getClientIp, LoginRateLimiter } from "./auth-security";

const options = {
  identifierAttempts: 3,
  ipAttempts: 10,
  windowMs: 1_000,
  blockMs: 2_000,
};

describe("LoginRateLimiter", () => {
  it("bloqueia um identificador após o limite e libera após o prazo", () => {
    let now = 1_000;
    const limiter = new LoginRateLimiter(options, () => now);

    limiter.registerFailure("Admin", "10.0.0.1");
    limiter.registerFailure("admin", "10.0.0.1");
    expect(limiter.isBlocked("ADMIN", "10.0.0.2")).toBe(false);

    limiter.registerFailure("ADMIN", "10.0.0.2");
    expect(limiter.isBlocked("admin", "10.0.0.3")).toBe(true);

    now += options.blockMs + 1;
    expect(limiter.isBlocked("admin", "10.0.0.3")).toBe(false);
  });

  it("limpa as falhas do identificador depois de um login válido", () => {
    const limiter = new LoginRateLimiter(options);
    limiter.registerFailure("admin", "10.0.0.1");
    limiter.registerFailure("admin", "10.0.0.1");
    limiter.registerSuccess("admin");
    limiter.registerFailure("admin", "10.0.0.2");

    expect(limiter.isBlocked("admin", "10.0.0.2")).toBe(false);
  });

  it("limita muitas tentativas originadas do mesmo IP", () => {
    const limiter = new LoginRateLimiter({ ...options, ipAttempts: 2 });
    limiter.registerFailure("primeiro", "10.0.0.1");
    limiter.registerFailure("segundo", "10.0.0.1");

    expect(limiter.isBlocked("terceiro", "10.0.0.1")).toBe(true);
    expect(limiter.isBlocked("terceiro", "10.0.0.2")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("usa o primeiro endereço encaminhado pelo proxy", () => {
    const request = new Request("http://localhost/login", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});
