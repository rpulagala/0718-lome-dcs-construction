import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

/**
 * Lightweight, self-contained session for the client portal — separate from the
 * staff Auth.js session. A compact HMAC-signed token in an httpOnly cookie:
 * `base64url(payload).base64url(hmac)`. No external JWT dependency.
 */
export const PORTAL_COOKIE = "dcs_portal";
export const PORTAL_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface PortalSession {
  sub: string; // CustomerAccount id
  email: string;
  name: string | null;
  exp: number; // unix seconds
}

function secret(): string {
  return env.AUTH_SECRET || "dev-portal-secret-change-me";
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createToken(p: { sub: string; email: string; name: string | null }): string {
  const body: PortalSession = { ...p, exp: Math.floor(Date.now() / 1000) + PORTAL_MAX_AGE };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyToken(token: string | undefined): PortalSession | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(data, "base64url").toString()) as PortalSession;
    if (typeof body.exp !== "number" || body.exp < Math.floor(Date.now() / 1000)) return null;
    if (!body.sub || !body.email) return null;
    return body;
  } catch {
    return null;
  }
}

/** Read the portal session in a Server Component / route handler. */
export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  return verifyToken(store.get(PORTAL_COOKIE)?.value);
}

/** Require a signed-in customer or redirect to the portal sign-in. */
export async function requirePortalUser(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/app/signin");
  return session;
}
