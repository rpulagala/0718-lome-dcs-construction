import { prisma } from "@/lib/db";
import type { RequestStatus, Priority, NoteVisibility } from "@/lib/generated/prisma/enums";
import { canTransition, notifiesCustomer } from "@/lib/domain/statusMachine";
import { toCustomerStatus, internalStatusLabel } from "@/lib/domain/status";
import { renderStatusUpdate } from "./emailTemplates";
import { sendEmail } from "./mailService";
import { logger } from "@/lib/logger";

export async function changeStatus(
  actorId: string,
  requestId: string,
  toStatus: RequestStatus,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    include: { customer: { select: { fullName: true, email: true } } },
  });
  if (!wr) return { ok: false, error: "Request not found" };
  if (wr.status === toStatus) return { ok: false, error: "Status unchanged" };
  if (!canTransition(wr.status, toStatus)) {
    return { ok: false, error: `Cannot move from ${internalStatusLabel(wr.status)} to ${internalStatusLabel(toStatus)}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workRequest.update({
      where: { id: requestId },
      data: {
        status: toStatus,
        // Mark first contact when moving out of NEW toward contact.
        ...(wr.firstContactedAt == null && toStatus === "CONTACTED"
          ? { firstContactedAt: new Date() }
          : {}),
      },
    });
    await tx.workRequestStatusHistory.create({
      data: {
        workRequestId: requestId,
        fromStatus: wr.status,
        toStatus,
        reason: reason || null,
        changedById: actorId,
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "STATUS_CHANGED",
        summary: `Status changed to ${internalStatusLabel(toStatus)}`,
        isCustomerVisible: notifiesCustomer(toStatus),
      },
    });
  });

  if (notifiesCustomer(toStatus)) {
    try {
      const email = renderStatusUpdate({
        customerName: wr.customer.fullName,
        requestNumber: wr.requestNumber,
        customerStatus: toCustomerStatus(toStatus),
      });
      await sendEmail({
        template: "status_update",
        to: wr.customer.email,
        recipientType: "customer",
        workRequestId: requestId,
        relatedRequestId: requestId,
        ...email,
      });
    } catch (err) {
      logger.error("status.notify_failed", { requestId, error: String(err) });
    }
  }

  return { ok: true };
}

export async function assignRequest(
  actorId: string,
  requestId: string,
  assigneeId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const assigneeName = assigneeId
    ? (await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } }))?.name
    : null;
  if (assigneeId && !assigneeName) return { ok: false, error: "Assignee not found" };

  await prisma.$transaction(async (tx) => {
    await tx.workRequest.update({
      where: { id: requestId },
      data: { assignedToId: assigneeId },
    });
    await tx.workRequestAssignmentHistory.create({
      data: { workRequestId: requestId, assignedToId: assigneeId, assignedById: actorId },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "ASSIGNED",
        summary: assigneeName ? `Assigned to ${assigneeName}` : "Unassigned",
      },
    });
  });
  return { ok: true };
}

export async function setPriority(
  actorId: string,
  requestId: string,
  priority: Priority,
): Promise<{ ok: boolean }> {
  await prisma.workRequest.update({ where: { id: requestId }, data: { priority } });
  await prisma.workRequestActivity.create({
    data: {
      workRequestId: requestId,
      type: "STATUS_CHANGED",
      summary: `Priority set to ${priority.toLowerCase()}`,
    },
  });
  return { ok: true };
}

export async function addNote(
  actorId: string,
  requestId: string,
  body: string,
  visibility: NoteVisibility,
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (text.length === 0) return { ok: false, error: "Note cannot be empty" };
  await prisma.$transaction(async (tx) => {
    await tx.workRequestNote.create({
      data: { workRequestId: requestId, authorId: actorId, body: text, visibility },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "NOTE_ADDED",
        summary: visibility === "CUSTOMER_VISIBLE" ? "Customer-visible note added" : "Internal note added",
        isCustomerVisible: visibility === "CUSTOMER_VISIBLE",
      },
    });
  });
  return { ok: true };
}
