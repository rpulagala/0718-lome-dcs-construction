import { NextRequest, NextResponse } from "next/server";
import { verifyLoginCode } from "@/lib/services/portalAuth";
import { rateLimit } from "@/lib/services/rateLimit";
import { createToken, PORTAL_COOKIE, PORTAL_MAX_AGE } from "@/lib/portal/session";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Verify a login code; on success set the portal session cookie. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Email and code are required." }, { status: 400 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`portal-verify:${ip}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const res = await verifyLoginCode(email, code);
  if (!res.ok || !res.account) {
    return NextResponse.json({ ok: false, error: res.error ?? "Invalid code." }, { status: 401 });
  }

  const token = createToken({ sub: res.account.id, email: res.account.email, name: res.account.name });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_MAX_AGE,
  });
  return response;
}
