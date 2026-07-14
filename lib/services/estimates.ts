import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { EstimateStatus } from "@/lib/generated/prisma/enums";
import { canTransitionEstimate, isEstimateEditable } from "@/lib/domain/estimateStatus";
import { formatEstimateNumber } from "@/lib/domain/requestNumber";
import { formatInCompanyTz, formatMoney } from "@/lib/utils";
import { estimateSchema, type EstimateInput } from "@/lib/validation/estimate";
import { advanceRequestStatusTx } from "./statusAdvance";
import { recordAudit } from "./audit";
import { renderEstimateSent } from "./emailTemplates";
import { sendEmail } from "./mailService";
import { logger } from "@/lib/logger";

export interface EstimateResult {
  ok: boolean;
  error?: string;
  estimateId?: string;
  estimateNumber?: string;
}

type Tx = Prisma.TransactionClient;

/** Allocate the next EST-YYYY-NNNNNN number transactionally. */
async function allocateEstimateNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.estimateCounter.upsert({
    where: { year },
    update: { lastValue: { increment: 1 } },
    create: { year, lastValue: 1 },
  });
  return formatEstimateNumber(year, counter.lastValue);
}

/** Normalize a validated money string to a Prisma-safe decimal string or null. */
function money(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

/** Parse a validated YYYY-MM-DD string to a Date (UTC midnight) or null. */
function dateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Create a draft estimate against a request and advance it toward estimating. */
export async function createEstimate(
  actorId: string,
  requestId: string,
  input: EstimateInput,
): Promise<EstimateResult> {
  const parsed = estimateSchema.parse(input);
  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!wr) return { ok: false, error: "Request not found" };

  const estimate = await prisma.$transaction(async (tx) => {
    const estimateNumber = await allocateEstimateNumber(tx);
    const e = await tx.estimate.create({
      data: {
        estimateNumber,
        workRequestId: requestId,
        status: "DRAFT",
        description: money(parsed.description) ?? undefined,
        amount: money(parsed.amount),
        expiresAt: dateOnly(parsed.expiresAt),
        internalNotes: money(parsed.internalNotes),
        customerNotes: money(parsed.customerNotes),
        createdById: actorId,
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "ESTIMATE_SENT",
        summary: `Estimate ${estimateNumber} drafted`,
      },
    });
    // Move the request into the estimating stage if the machine allows it.
    await advanceRequestStatusTx(tx, wr, "ESTIMATE_IN_PROGRESS", actorId, "Estimate drafted");
    await recordAudit(
      { actorId, action: "estimate.create", entityType: "Estimate", entityId: e.id, metadata: { estimateNumber } },
      tx,
    );
    return e;
  });

  return { ok: true, estimateId: estimate.id, estimateNumber: estimate.estimateNumber };
}

/** Edit an editable (draft/under-review) estimate's fields. */
export async function updateEstimate(
  actorId: string,
  estimateId: string,
  input: EstimateInput,
): Promise<EstimateResult> {
  const parsed = estimateSchema.parse(input);
  const existing = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Estimate not found" };
  if (!isEstimateEditable(existing.status)) {
    return { ok: false, error: "Only draft or under-review estimates can be edited" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.estimate.update({
      where: { id: estimateId },
      data: {
        description: money(parsed.description),
        amount: money(parsed.amount),
        expiresAt: dateOnly(parsed.expiresAt),
        internalNotes: money(parsed.internalNotes),
        customerNotes: money(parsed.customerNotes),
      },
    });
    await recordAudit(
      { actorId, action: "estimate.update", entityType: "Estimate", entityId: estimateId },
      tx,
    );
  });

  return { ok: true, estimateId };
}

/**
 * Move an estimate through its lifecycle. Side-effects by target status:
 * - SENT: stamp `sentAt`, advance request to ESTIMATE_SENT, email the customer.
 * - ACCEPTED: advance request to APPROVED (ready for project conversion).
 * - DECLINED: advance request to DECLINED.
 */
export async function changeEstimateStatus(
  actorId: string,
  estimateId: string,
  toStatus: EstimateStatus,
): Promise<EstimateResult> {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    include: {
      workRequest: {
        select: {
          id: true,
          status: true,
          requestNumber: true,
          customer: { select: { fullName: true, email: true } },
        },
      },
    },
  });
  if (!estimate) return { ok: false, error: "Estimate not found" };
  if (!canTransitionEstimate(estimate.status, toStatus)) {
    return { ok: false, error: `Cannot move estimate from ${estimate.status} to ${toStatus}` };
  }

  const wr = estimate.workRequest;

  await prisma.$transaction(async (tx) => {
    await tx.estimate.update({
      where: { id: estimateId },
      data: {
        status: toStatus,
        ...(toStatus === "SENT" && !estimate.sentAt ? { sentAt: new Date() } : {}),
      },
    });

    if (toStatus === "SENT") {
      await tx.workRequestActivity.create({
        data: {
          workRequestId: wr.id,
          type: "ESTIMATE_SENT",
          summary: `Estimate ${estimate.estimateNumber} sent to customer`,
          isCustomerVisible: true,
        },
      });
      await advanceRequestStatusTx(tx, wr, "ESTIMATE_SENT", actorId, "Estimate sent");
    } else if (toStatus === "ACCEPTED") {
      await tx.workRequestActivity.create({
        data: {
          workRequestId: wr.id,
          type: "STATUS_CHANGED",
          summary: `Estimate ${estimate.estimateNumber} accepted`,
        },
      });
      await advanceRequestStatusTx(tx, wr, "APPROVED", actorId, "Estimate accepted");
    } else if (toStatus === "DECLINED") {
      await tx.workRequestActivity.create({
        data: {
          workRequestId: wr.id,
          type: "STATUS_CHANGED",
          summary: `Estimate ${estimate.estimateNumber} declined`,
        },
      });
      await advanceRequestStatusTx(tx, wr, "DECLINED", actorId, "Estimate declined");
    }

    await recordAudit(
      {
        actorId,
        action: "estimate.status_change",
        entityType: "Estimate",
        entityId: estimateId,
        metadata: { from: estimate.status, to: toStatus },
      },
      tx,
    );
  });

  if (toStatus === "SENT") {
    try {
      const email = renderEstimateSent({
        customerName: wr.customer.fullName,
        requestNumber: wr.requestNumber,
        estimateNumber: estimate.estimateNumber,
        amount: estimate.amount ? formatMoney(estimate.amount) : null,
        expires: estimate.expiresAt ? formatInCompanyTz(estimate.expiresAt, { dateStyle: "medium" }) : null,
        customerNotes: estimate.customerNotes,
      });
      await sendEmail({
        template: "estimate_sent",
        to: wr.customer.email,
        recipientType: "customer",
        workRequestId: wr.id,
        relatedRequestId: wr.id,
        ...email,
      });
    } catch (err) {
      logger.error("estimate.notify_failed", { estimateId, error: String(err) });
    }
  }

  return { ok: true, estimateId };
}

/**
 * Supersede an estimate with a revision: flip the original to REVISED and open a
 * fresh DRAFT copying its figures, so the numbered history is preserved.
 */
export async function reviseEstimate(
  actorId: string,
  estimateId: string,
): Promise<EstimateResult> {
  const original = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!original) return { ok: false, error: "Estimate not found" };
  if (!canTransitionEstimate(original.status, "REVISED")) {
    return { ok: false, error: "Only a sent, declined, or expired estimate can be revised" };
  }

  const revision = await prisma.$transaction(async (tx) => {
    await tx.estimate.update({ where: { id: estimateId }, data: { status: "REVISED" } });
    const estimateNumber = await allocateEstimateNumber(tx);
    const e = await tx.estimate.create({
      data: {
        estimateNumber,
        workRequestId: original.workRequestId,
        status: "DRAFT",
        description: original.description,
        amount: original.amount,
        expiresAt: original.expiresAt,
        internalNotes: original.internalNotes,
        customerNotes: original.customerNotes,
        createdById: actorId,
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: original.workRequestId,
        type: "ESTIMATE_SENT",
        summary: `Estimate ${original.estimateNumber} revised as ${estimateNumber}`,
      },
    });
    await recordAudit(
      {
        actorId,
        action: "estimate.revise",
        entityType: "Estimate",
        entityId: e.id,
        metadata: { revisionOf: original.estimateNumber, estimateNumber },
      },
      tx,
    );
    return e;
  });

  return { ok: true, estimateId: revision.id, estimateNumber: revision.estimateNumber };
}
