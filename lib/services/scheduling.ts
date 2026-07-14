import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { RequestStatus } from "@/lib/generated/prisma/enums";
import { canTransition, notifiesCustomer } from "@/lib/domain/statusMachine";
import { internalStatusLabel } from "@/lib/domain/status";
import {
  combineDateTime,
  visitWindow,
  rangesOverlap,
  ACTIVE_APPOINTMENT_STATUSES,
  type VisitWindow,
} from "@/lib/domain/scheduling";
import { siteVisitSchema, type SiteVisitInput } from "@/lib/validation/siteVisit";
import { formatInCompanyTz } from "@/lib/utils";
import {
  renderSiteVisitScheduled,
  renderSiteVisitRescheduled,
  renderSiteVisitCancelled,
  renderEmployeeVisitAssignment,
} from "./emailTemplates";
import { sendEmail } from "./mailService";
import { logger } from "@/lib/logger";

export interface SchedulingResult {
  ok: boolean;
  error?: string;
  siteVisitId?: string;
  conflict?: boolean;
}

type Tx = Prisma.TransactionClient;

/** Advance the work request status within a transaction (no email side-effect). */
async function advanceStatusTx(
  tx: Tx,
  wr: { id: string; status: RequestStatus },
  toStatus: RequestStatus,
  actorId: string,
  reason?: string,
): Promise<void> {
  if (wr.status === toStatus || !canTransition(wr.status, toStatus)) return;
  await tx.workRequest.update({ where: { id: wr.id }, data: { status: toStatus } });
  await tx.workRequestStatusHistory.create({
    data: {
      workRequestId: wr.id,
      fromStatus: wr.status,
      toStatus,
      reason: reason ?? null,
      changedById: actorId,
    },
  });
  await tx.workRequestActivity.create({
    data: {
      workRequestId: wr.id,
      type: "STATUS_CHANGED",
      summary: `Status changed to ${internalStatusLabel(toStatus)}`,
      isCustomerVisible: notifiesCustomer(toStatus),
    },
  });
}

/**
 * Find an active site visit for `assignedToId` whose time window overlaps
 * `window`. Used as the double-booking guard. Excludes `excludeVisitId` so a
 * visit does not conflict with itself on reschedule.
 */
export async function findVisitConflict(
  assignedToId: string,
  window: VisitWindow,
  excludeVisitId?: string,
) {
  const from = new Date(window.start.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(window.end.getTime() + 24 * 60 * 60 * 1000);
  const candidates = await prisma.siteVisit.findMany({
    where: {
      assignedToId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
      scheduledDate: { gte: from, lte: to },
      ...(excludeVisitId ? { id: { not: excludeVisitId } } : {}),
    },
    select: { id: true, scheduledDate: true, endTime: true },
  });
  for (const c of candidates) {
    if (rangesOverlap(window, visitWindow(c.scheduledDate, c.endTime))) return c;
  }
  return null;
}

function locationLine(a: { street: string; unit: string | null; city: string; state: string; zip: string }) {
  return `${a.street}${a.unit ? `, ${a.unit}` : ""}, ${a.city}, ${a.state} ${a.zip}`;
}

/** Notify customer + assigned employee after a visit change. Never throws. */
async function notifyVisit(
  action: "scheduled" | "rescheduled" | "cancelled",
  requestId: string,
  opts: {
    notifyCustomer: boolean;
    customerName: string;
    customerEmail: string;
    requestNumber: string;
    when: string;
    location: string;
    customerInstructions?: string | null;
    internalInstructions?: string | null;
    assignee?: { email: string } | null;
    reason?: string | null;
  },
): Promise<void> {
  try {
    if (opts.notifyCustomer) {
      const email =
        action === "scheduled"
          ? renderSiteVisitScheduled({
              customerName: opts.customerName,
              requestNumber: opts.requestNumber,
              when: opts.when,
              serviceLocation: opts.location,
              customerInstructions: opts.customerInstructions,
            })
          : action === "rescheduled"
            ? renderSiteVisitRescheduled({
                customerName: opts.customerName,
                requestNumber: opts.requestNumber,
                when: opts.when,
                serviceLocation: opts.location,
                customerInstructions: opts.customerInstructions,
              })
            : renderSiteVisitCancelled({
                customerName: opts.customerName,
                requestNumber: opts.requestNumber,
                reason: opts.reason,
              });
      await sendEmail({
        template: `site_visit_${action}`,
        to: opts.customerEmail,
        recipientType: "customer",
        workRequestId: requestId,
        relatedRequestId: requestId,
        ...email,
      });
    }
    if (opts.assignee?.email) {
      const email = renderEmployeeVisitAssignment({
        requestNumber: opts.requestNumber,
        when: opts.when,
        serviceLocation: opts.location,
        customerName: opts.customerName,
        action,
        internalInstructions: opts.internalInstructions,
      });
      await sendEmail({
        template: `site_visit_${action}_employee`,
        to: opts.assignee.email,
        recipientType: "employee",
        workRequestId: requestId,
        relatedRequestId: requestId,
        ...email,
      });
    }
  } catch (err) {
    logger.error("sitevisit.notify_failed", { requestId, action, error: String(err) });
  }
}

export async function scheduleSiteVisit(
  actorId: string,
  requestId: string,
  input: SiteVisitInput,
): Promise<SchedulingResult> {
  const parsed = siteVisitSchema.parse(input);
  const start = combineDateTime(parsed.date, parsed.startTime || null);
  if (!start) return { ok: false, error: "Invalid visit date or time" };
  const end = parsed.endTime ? combineDateTime(parsed.date, parsed.endTime) : null;
  if (parsed.endTime && !end) return { ok: false, error: "Invalid end time" };
  if (end && end.getTime() <= start.getTime()) {
    return { ok: false, error: "End time must be after the start time" };
  }

  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: { customer: { select: { fullName: true, email: true } }, address: true },
  });
  if (!wr) return { ok: false, error: "Request not found" };

  const assignedToId = parsed.assignedToId || wr.assignedToId || null;
  const addressId = parsed.addressId || wr.addressId;
  const window = visitWindow(start, end);

  if (assignedToId) {
    const conflict = await findVisitConflict(assignedToId, window);
    if (conflict) {
      return {
        ok: false,
        conflict: true,
        error: "That employee already has a visit booked during this time.",
      };
    }
  }

  const assignee = assignedToId
    ? await prisma.user.findUnique({ where: { id: assignedToId }, select: { email: true } })
    : null;
  const when = formatInCompanyTz(start);

  const visit = await prisma.$transaction(async (tx) => {
    const v = await tx.siteVisit.create({
      data: {
        workRequestId: requestId,
        addressId,
        assignedToId,
        scheduledDate: start,
        startTime: start,
        endTime: end,
        status: parsed.confirmed ? "CONFIRMED" : "PROPOSED",
        internalInstructions: parsed.internalInstructions || null,
        customerInstructions: parsed.customerInstructions || null,
      },
    });
    await tx.siteVisitHistory.create({
      data: { siteVisitId: v.id, changeType: "created", newDate: start },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "SITE_VISIT_SCHEDULED",
        summary: `Site visit scheduled for ${when}`,
        isCustomerVisible: true,
      },
    });
    await advanceStatusTx(tx, wr, "SITE_VISIT_SCHEDULED", actorId, "Site visit scheduled");
    return v;
  });

  await notifyVisit("scheduled", requestId, {
    notifyCustomer: parsed.notifyCustomer,
    customerName: wr.customer.fullName,
    customerEmail: wr.customer.email,
    requestNumber: wr.requestNumber,
    when,
    location: locationLine(wr.address),
    customerInstructions: parsed.customerInstructions,
    internalInstructions: parsed.internalInstructions,
    assignee,
  });

  return { ok: true, siteVisitId: visit.id };
}

export async function rescheduleSiteVisit(
  actorId: string,
  siteVisitId: string,
  input: SiteVisitInput,
): Promise<SchedulingResult> {
  const parsed = siteVisitSchema.parse(input);
  const start = combineDateTime(parsed.date, parsed.startTime || null);
  if (!start) return { ok: false, error: "Invalid visit date or time" };
  const end = parsed.endTime ? combineDateTime(parsed.date, parsed.endTime) : null;
  if (parsed.endTime && !end) return { ok: false, error: "Invalid end time" };
  if (end && end.getTime() <= start.getTime()) {
    return { ok: false, error: "End time must be after the start time" };
  }

  const visit = await prisma.siteVisit.findUnique({
    where: { id: siteVisitId },
    include: {
      workRequest: { include: { customer: { select: { fullName: true, email: true } }, address: true } },
    },
  });
  if (!visit) return { ok: false, error: "Site visit not found" };
  if (visit.status === "COMPLETED" || visit.status === "CANCELLED") {
    return { ok: false, error: "A completed or cancelled visit cannot be rescheduled" };
  }

  const assignedToId = parsed.assignedToId || visit.assignedToId || null;
  const window = visitWindow(start, end);
  if (assignedToId) {
    const conflict = await findVisitConflict(assignedToId, window, siteVisitId);
    if (conflict) {
      return {
        ok: false,
        conflict: true,
        error: "That employee already has a visit booked during this time.",
      };
    }
  }

  const assignee = assignedToId
    ? await prisma.user.findUnique({ where: { id: assignedToId }, select: { email: true } })
    : null;
  const previousDate = visit.scheduledDate;
  const when = formatInCompanyTz(start);

  await prisma.$transaction(async (tx) => {
    await tx.siteVisit.update({
      where: { id: siteVisitId },
      data: {
        scheduledDate: start,
        startTime: start,
        endTime: end,
        assignedToId,
        status: "RESCHEDULED",
        ...(parsed.customerInstructions ? { customerInstructions: parsed.customerInstructions } : {}),
        ...(parsed.internalInstructions ? { internalInstructions: parsed.internalInstructions } : {}),
      },
    });
    await tx.siteVisitHistory.create({
      data: {
        siteVisitId,
        changeType: "rescheduled",
        previousDate,
        newDate: start,
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: visit.workRequestId,
        type: "SITE_VISIT_UPDATED",
        summary: `Site visit rescheduled to ${when}`,
        isCustomerVisible: true,
      },
    });
  });

  await notifyVisit("rescheduled", visit.workRequestId, {
    notifyCustomer: parsed.notifyCustomer,
    customerName: visit.workRequest.customer.fullName,
    customerEmail: visit.workRequest.customer.email,
    requestNumber: visit.workRequest.requestNumber,
    when,
    location: locationLine(visit.workRequest.address),
    customerInstructions: parsed.customerInstructions,
    internalInstructions: parsed.internalInstructions,
    assignee,
  });

  return { ok: true, siteVisitId };
}

export async function cancelSiteVisit(
  actorId: string,
  siteVisitId: string,
  reason?: string,
): Promise<SchedulingResult> {
  const visit = await prisma.siteVisit.findUnique({
    where: { id: siteVisitId },
    include: {
      assignedTo: { select: { email: true } },
      workRequest: {
        include: { customer: { select: { fullName: true, email: true } }, address: true },
      },
    },
  });
  if (!visit) return { ok: false, error: "Site visit not found" };
  if (visit.status === "CANCELLED") return { ok: false, error: "Visit is already cancelled" };
  if (visit.status === "COMPLETED") return { ok: false, error: "A completed visit cannot be cancelled" };

  const wr = visit.workRequest;

  await prisma.$transaction(async (tx) => {
    await tx.siteVisit.update({
      where: { id: siteVisitId },
      data: { status: "CANCELLED", cancellationReason: reason || null },
    });
    await tx.siteVisitHistory.create({
      data: { siteVisitId, changeType: "cancelled", previousDate: visit.scheduledDate, reason: reason || null },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: wr.id,
        type: "SITE_VISIT_UPDATED",
        summary: "Site visit cancelled",
        isCustomerVisible: true,
      },
    });
    // If no other active visit remains, move the request back to "to schedule".
    const otherActive = await tx.siteVisit.count({
      where: {
        workRequestId: wr.id,
        id: { not: siteVisitId },
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
      },
    });
    if (otherActive === 0) {
      await advanceStatusTx(
        tx,
        { id: wr.id, status: wr.status },
        "SITE_VISIT_TO_SCHEDULE",
        actorId,
        "Site visit cancelled",
      );
    }
  });

  await notifyVisit("cancelled", wr.id, {
    notifyCustomer: true,
    customerName: wr.customer.fullName,
    customerEmail: wr.customer.email,
    requestNumber: wr.requestNumber,
    when: formatInCompanyTz(visit.scheduledDate),
    location: locationLine(wr.address),
    assignee: visit.assignedTo,
    reason,
  });

  return { ok: true, siteVisitId };
}

export async function completeSiteVisit(
  actorId: string,
  siteVisitId: string,
): Promise<SchedulingResult> {
  const visit = await prisma.siteVisit.findUnique({
    where: { id: siteVisitId },
    include: { workRequest: { select: { id: true, status: true } } },
  });
  if (!visit) return { ok: false, error: "Site visit not found" };
  if (visit.status === "COMPLETED") return { ok: false, error: "Visit is already completed" };
  if (visit.status === "CANCELLED") return { ok: false, error: "A cancelled visit cannot be completed" };

  await prisma.$transaction(async (tx) => {
    await tx.siteVisit.update({ where: { id: siteVisitId }, data: { status: "COMPLETED" } });
    await tx.siteVisitHistory.create({
      data: { siteVisitId, changeType: "completed", newDate: visit.scheduledDate },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: visit.workRequestId,
        type: "SITE_VISIT_UPDATED",
        summary: "Site visit marked complete",
      },
    });
    await advanceStatusTx(
      tx,
      { id: visit.workRequest.id, status: visit.workRequest.status },
      "SITE_VISIT_COMPLETED",
      actorId,
      "Site visit completed",
    );
  });

  return { ok: true, siteVisitId };
}
