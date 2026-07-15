import { NextRequest, NextResponse } from "next/server";
import { requestLoginCode } from "@/lib/services/portalAuth";
import { rateLimit } from "@/lib/services/rateLimit";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Issue a one-time sign-in code. Always returns { ok: true } to avoid account enumeration. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });

  const ip = clientIp(req);
  const ipOk = rateLimit(`portal-code-ip:${ip}`, 8, 10 * 60 * 1000).ok;
  const emailOk = rateLimit(`portal-code-email:${email}`, 4, 10 * 60 * 1000).ok;

  // Only actually send when under the limits; always report ok.
  if (ipOk && emailOk) await requestLoginCode(email);
  return NextResponse.json({ ok: true });
}
