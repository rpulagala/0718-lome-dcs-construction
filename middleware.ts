import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe middleware: reads the JWT and enforces route protection via the
// `authorized` callback. No database access here.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on app pages; skip API routes (they do their own authz), static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
