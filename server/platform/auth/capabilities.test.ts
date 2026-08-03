import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/server/platform/errors/app-error";
import { assertCapability, hasCapability, type Actor } from "./capabilities";

const admin: Actor = { id: "admin", name: "Admin", role: "ADMIN" };
const employee: Actor = { id: "employee", name: "Employee", role: "EMPLOYEE" };

describe("capacidades", () => {
  it("permite todas as capacidades ao administrador", () => {
    expect(hasCapability(admin, "finance:manage")).toBe(true);
    expect(hasCapability(admin, "history:export")).toBe(true);
  });

  it("limita o funcionário aos fluxos operacionais", () => {
    expect(hasCapability(employee, "work-orders:execute")).toBe(true);
    expect(hasCapability(employee, "finance:read")).toBe(false);
    expect(() => assertCapability(employee, "settings:manage")).toThrow(
      AuthorizationError,
    );
  });
});
