import { auth } from "@/auth";
import {
  assertCapability,
  type Actor,
  type Capability,
} from "./capabilities";

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "Usuário",
    role: session.user.role,
  };
}
export async function requireCapability(capability: Capability) {
  const actor = await getActor();
  assertCapability(actor, capability);
  return actor;
}
