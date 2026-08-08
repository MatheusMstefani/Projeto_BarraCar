import { cache } from "react";
import { db } from "@/lib/db";
import { getSupabaseIdentity } from "@/lib/supabase/identity";

/**
 * Conecta a identidade verificada pelo Supabase ao usuário de negócio já
 * existente, pelo e-mail. A autorização continua vindo do banco Barracar.
 */
export const auth = cache(async () => {
  const identity = await getSupabaseIdentity();
  if (!identity?.email) return null;

  const currentUser = await db.user.findUnique({
    where: { email: identity.email },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!currentUser?.active) return null;

  return {
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    },
    supabaseUserId: identity.id,
  };
});
