import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/generated/prisma/enums";

/** Protected path prefixes (employee+). Everything else is public. */
const APP_PREFIXES = [
  "/dashboard",
  "/requests",
  "/schedule",
  "/estimates",
  "/projects",
  "/admin",
];

/**
 * Edge-safe auth config shared by middleware and the Node auth instance.
 * Contains NO database access (middleware runs on the edge runtime).
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id ?? token.uid;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (typeof token.uid === "string") session.user.id = token.uid;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected = APP_PREFIXES.some((p) => pathname.startsWith(p));
      if (!isProtected) return true;

      const role = auth?.user?.role;
      if (!role) return false; // not signed in

      if (pathname.startsWith("/admin") && role !== "PRINCIPAL_ADMIN") {
        return false;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
