import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal/session";
import { prisma } from "@/lib/db";
import { readObject } from "@/lib/services/blobStorage";

export const runtime = "nodejs";

/**
 * Portal-scoped file serving. A signed-in customer may read a stored photo ONLY
 * if it belongs to a work request linked to their account. This is the
 * access-control boundary for the customer app's private uploads — the staff
 * /api/files route is a separate boundary and never trusted here.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> },
) {
  const session = await getPortalSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { key } = await ctx.params;
  const locator = key.map((k) => decodeURIComponent(k)).join("/");

  // Ownership check: the photo's storageKey must be on a request owned by the
  // signed-in account. A key the customer doesn't own is indistinguishable from
  // one that doesn't exist (404).
  const owned = await prisma.workRequestPhoto.findFirst({
    where: { storageKey: locator, workRequest: { customerAccountId: session.sub } },
    select: { id: true },
  });
  if (!owned) return new NextResponse("Not found", { status: 404 });

  const obj = await readObject(locator);
  if (!obj) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(obj.data), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
