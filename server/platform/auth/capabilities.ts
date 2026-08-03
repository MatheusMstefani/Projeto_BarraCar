import {
  AuthenticationError,
  AuthorizationError,
} from "@/server/platform/errors/app-error";

export type AppRole = "ADMIN" | "EMPLOYEE";

export type Capability =
  | "admin:access"
  | "customers:read"
  | "customers:manage"
  | "vehicles:read"
  | "vehicles:manage"
  | "employees:read"
  | "employees:manage"
  | "services:read"
  | "services:manage"
  | "work-orders:read"
  | "work-orders:manage"
  | "work-orders:execute"
  | "work-orders:manage-payment"
  | "appointments:read"
  | "appointments:manage"
  | "finance:read"
  | "finance:manage"
  | "inspections:read"
  | "inspections:collect"
  | "inspections:override-locked"
  | "documents:read"
  | "documents:generate"
  | "signatures:collect"
  | "history:read"
  | "history:export"
  | "settings:manage"
  | "users:manage";

export type Actor = {
  id: string;
  name: string;
  role: AppRole;
};

const employeeCapabilities = new Set<Capability>([
  "customers:read",
  "vehicles:read",
  "services:read",
  "work-orders:read",
  "work-orders:execute",
  "appointments:read",
  "inspections:read",
  "inspections:collect",
  "documents:read",
  "documents:generate",
  "signatures:collect",
]);

export function hasCapability(actor: Actor, capability: Capability) {
  return actor.role === "ADMIN" || employeeCapabilities.has(capability);
}
export function assertCapability(
  actor: Actor | null | undefined,
  capability: Capability,
): asserts actor is Actor {
  if (!actor) throw new AuthenticationError();
  if (!hasCapability(actor, capability)) throw new AuthorizationError();
}
