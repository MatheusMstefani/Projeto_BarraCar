import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [Credentials({ credentials: { login: {}, password: {} }, authorize: async (raw) => {
    const parsed = z.object({ login: z.string().min(1), password: z.string().min(8) }).safeParse(raw);
    if (!parsed.success) return null;
    const user = await db.user.findFirst({ where: { OR: [{ email: parsed.data.login }, { username: parsed.data.login }], active: true } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } })],
  callbacks: {
    jwt({ token, user }) { if (user) { token.id = user.id; token.role = (user as { role: string }).role; } return token; },
    session({ session, token }) { session.user.id = String(token.id); session.user.role = String(token.role) as "ADMIN" | "EMPLOYEE"; return session; }
  }
});
