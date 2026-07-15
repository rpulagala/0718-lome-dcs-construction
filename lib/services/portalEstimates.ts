import { prisma } from "@/lib/db";
import { advanceRequestStatusTx } from "./statusAdvance";
import { recordAudit } from "./audit";
import { createProjectFromEstimateTx } from "./projects";

export interface PortalEstimateResult {
  ok: boolean;
  error?: string;
  projectId?: string;
}

export type EstimateDecision = "accept" | "decline";

/**
 * A signed-in customer accepts or declines one of their SENT estimates. Every
 * lookup is scoped to the account — the estimate's request must belong to
 * `accountId`, so an id the account doesn't own resolves to `not_found` (no
 * IDOR; same pattern as `portalData`/`messaging`). Accept flips the estimate to
 * ACCEPTED, advances the request to APPROVED, and auto-converts it to a tracked
 * project (default name = the request's category — staff can rename it in the
 * console); decline flips the estimate and request to DECLINED. Each path is a
 * single atomic transaction and is audited with `actorId: null` (customers are
 * not staff `User`s — the account id is recorded in `metadata`).
 */
export async function respondToPortalEstimate(
  accountId: string,
  estimateId: string,
  decision: EstimateDecision,
): Promise<PortalEstimateResult> {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, workRequest: { customerAccountId: accountId } },
    select: {
      id: true,
      estimateNumber: true,
      status: true,
      amount: true,
      expiresAt: true,
      project: { select: { id: true } },
      workRequest: {
        select: {
          id: true,
          status: true,
          customerId: true,
          addressId: true,
          categoryNameSnapshot: true,
          project: { select: { id: true } },
        },
      },
    },
  });
  if (!estimate) return { ok: false, error: "not_found" };
  if (estimate.status !== "SENT") {
    return { ok: false, error: "This estimate is no longer awaiting your decision." };
  }
  if (estimate.expiresAt && estimate.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      error: "This estimate has expired. Please contact the team for an updated estimate.",
    };
  }

  const wr = estimate.workRequest;

  if (decision === "decline") {
    await prisma.$transaction(async (tx) => {
      await tx.estimate.update({ where: { id: estimate.id }, data: { status: "DECLINED" } });
      await tx.workRequestActivity.create({
        data: {
          workRequestId: wr.id,
          type: "STATUS_CHANGED",
          summary: `You declined estimate ${estimate.estimateNumber}`,
          isCustomerVisible: true,
        },
      });
      await advanceRequestStatusTx(tx, wr, "DECLINED", null, "Estimate declined by customer");
      await recordAudit(
        {
          actorId: null,
          action: "estimate.customer_decline",
          entityType: "Estimate",
          entityId: estimate.id,
          metadata: { customerAccountId: accountId, estimateNumber: estimate.estimateNumber },
        },
        tx,
      );
    });
    return { ok: true };
  }

  // accept → convert to a project
  if (estimate.project || wr.project) {
    return { ok: false, error: "This request already has a project." };
  }
  const contractAmount = estimate.amount ? estimate.amount.toString() : null;

  const projectId = await prisma.$transaction(async (tx) => {
    await tx.estimate.update({ where: { id: estimate.id }, data: { status: "ACCEPTED" } });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: wr.id,
        type: "STATUS_CHANGED",
        summary: `You accepted estimate ${estimate.estimateNumber}`,
        isCustomerVisible: true,
      },
    });
    await advanceRequestStatusTx(tx, wr, "APPROVED", null, "Estimate accepted by customer");
    // advanceRequestStatusTx trusts wr.status; keep it current for the convert step.
    wr.status = "APPROVED";
    const pid = await createProjectFromEstimateTx(tx, {
      actorId: null,
      estimateId: estimate.id,
      wr,
      fields: { name: wr.categoryNameSnapshot, contractAmount },
    });
    await recordAudit(
      {
        actorId: null,
        action: "estimate.customer_accept",
        entityType: "Estimate",
        entityId: estimate.id,
        metadata: {
          customerAccountId: accountId,
          estimateNumber: estimate.estimateNumber,
          projectId: pid,
        },
      },
      tx,
    );
    return pid;
  });

  return { ok: true, projectId };
}
