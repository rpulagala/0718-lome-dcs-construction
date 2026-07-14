import { prisma } from "@/lib/db";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/domain/scheduling";
import type { AppointmentStatus } from "@/lib/generated/prisma/enums";

export interface CalendarParams {
  from: Date;
  to: Date;
  assignedToId?: string;
  includeInactive?: boolean;
}

/** Site visits within a date range, for the internal calendar view. */
export async function listSiteVisits(params: CalendarParams) {
  const statuses: AppointmentStatus[] = params.includeInactive
    ? ["PROPOSED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "NO_SHOW"]
    : [...ACTIVE_APPOINTMENT_STATUSES];

  return prisma.siteVisit.findMany({
    where: {
      scheduledDate: { gte: params.from, lt: params.to },
      status: { in: statuses },
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
    },
    orderBy: { scheduledDate: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      address: { select: { street: true, city: true, zip: true } },
      workRequest: {
        select: {
          id: true,
          requestNumber: true,
          categoryNameSnapshot: true,
          customer: { select: { fullName: true } },
        },
      },
    },
  });
}

export type CalendarVisit = Awaited<ReturnType<typeof listSiteVisits>>[number];
