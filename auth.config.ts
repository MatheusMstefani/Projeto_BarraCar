import type { NextAuthConfig } from "next-auth";

const configuredMaxAge = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS);
export const authSessionMaxAge =
  Number.isSafeInteger(configuredMaxAge) && configuredMaxAge >= 15 * 60 && configuredMaxAge <= 24 * 60 * 60
    ? configuredMaxAge
    : 8 * 60 * 60;

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: authSessionMaxAge },
  jwt: { maxAge: authSessionMaxAge },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
