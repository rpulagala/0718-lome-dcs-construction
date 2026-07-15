import { NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portal/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
