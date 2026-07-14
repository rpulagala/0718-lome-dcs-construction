import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { readObject } from "@/lib/services/blobStorage";

export const runtime = "nodejs";

/**
 * Auth-guarded file serving. Only signed-in staff may read stored photos; this
 * is the access-control boundary for private uploads (see docs/SECURITY.md).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { key } = await ctx.params;
  const locator = key.map((k) => decodeURIComponent(k)).join("/");
  const obj = await readObject(locator);
  if (!obj) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(obj.data), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
