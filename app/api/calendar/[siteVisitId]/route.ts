import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { buildICalEvent } from "@/lib/services/calendarSync";
import { visitWindow } from "@/lib/domain/scheduling";

export const runtime = "nodejs";

/**
 * Download a single site visit as an iCalendar (.ics) file so staff can add it
 * to their personal calendar. This is the MVP's calendar-integration seam (no
 * external sync); see docs/DECISIONS.md.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ siteVisitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { siteVisitId } = await ctx.params;
  const visit = await prisma.siteVisit.findUnique({
    where: { id: siteVisitId },
    include: {
      address: true,
      workRequest: {
        select: {
          requestNumber: true,
          categoryNameSnapshot: true,
          customer: { select: { fullName: true } },
        },
      },
    },
  });
  if (!visit) return new NextResponse("Not found", { status: 404 });

  const { start, end } = visitWindow(visit.scheduledDate, visit.endTime);
  const location = visit.address
    ? `${visit.address.street}, ${visit.address.city}, ${visit.address.state} ${visit.address.zip}`
    : undefined;

  const ics = buildICalEvent({
    uid: `sitevisit-${visit.id}@dcs-construction`,
    title: `Site visit — ${visit.workRequest.customer.fullName} (${visit.workRequest.categoryNameSnapshot})`,
    start,
    end,
    location,
    description: [
      `Request ${visit.workRequest.requestNumber}`,
      visit.internalInstructions ?? "",
    ]
      .filter(Boolean)
      .join(" — "),
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="visit-${visit.workRequest.requestNumber}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
