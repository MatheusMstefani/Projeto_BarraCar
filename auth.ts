import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { getClientIp, LoginRateLimiter } from "@/lib/auth-security";

const loginSchema = z.object({
  login: z.string().trim().min(1).max(254),
  password: z.string().min(8).max(256),
});

// This is deliberately not a real credential. Comparing against a fixed hash keeps
// unknown and inactive users on the same expensive bcrypt path as known users.
const INVALID_PASSWORD_HASH = "$2a$12$ynkEhwjqw49NQeypL3raye9lZhRsXjE4Kg5FqZNiU02ph68UERPkq";

const authGlobal = globalThis as typeof globalThis & {
  barracarLoginRateLimiter?: LoginRateLimiter;
};
const loginRateLimiter = authGlobal.barracarLoginRateLimiter ?? new LoginRateLimiter();
authGlobal.barracarLoginRateLimiter = loginRateLimiter;

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { login: {}, password: {} },
      authorize: async (raw, request) => {
        const login = typeof raw.login === "string" ? raw.login.trim() : "";
        const password = typeof raw.password === "string" ? raw.password : "";
        const ipAddress = getClientIp(request);

        if (loginRateLimiter.isBlocked(login, ipAddress)) return null;

        const parsed = loginSchema.safeParse({ login, password });
        if (!parsed.success) {
          await bcrypt.compare(password, INVALID_PASSWORD_HASH);
          loginRateLimiter.registerFailure(login, ipAddress);
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [{ email: parsed.data.login }, { username: parsed.data.login }],
            active: true,
          },
        });
        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? INVALID_PASSWORD_HASH,
        );

        if (!user || !passwordMatches) {
          loginRateLimiter.registerFailure(parsed.data.login, ipAddress);
          return null;
        }

        loginRateLimiter.registerSuccess(parsed.data.login);
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id);
      session.user.role = String(token.role) as "ADMIN" | "EMPLOYEE";
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Returns only sessions whose user still exists and is active. The role and
 * profile are read from the database on every protected server request, so JWT
 * claims are never trusted after an administrator changes the account.
 */
export async function auth() {
  const session = await nextAuth.auth();
  if (!session?.user.id) return null;

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!currentUser?.active) return null;

  return {
    ...session,
    user: {
      ...session.user,
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    },
  };
}
