import type { Prisma } from "@/lib/generated/prisma/client";
import type { RequestStatus, ActivityType } from "@/lib/generated/prisma/enums";
import { canTransition, notifiesCustomer } from "@/lib/domain/statusMachine";
import { internalStatusLabel } from "@/lib/domain/status";

type Tx = Prisma.TransactionClient;

/**
 * Best-effort advance of a work request's status inside a transaction, recording
 * status history + a timeline activity. A no-op when the target equals the
 * current status or the guarded state machine forbids the move — so callers can
 * request the "ideal" status for a downstream event without pre-checking. No
 * email side-effect (callers own customer notifications post-commit).
 */
export async function advanceRequestStatusTx(
  tx: Tx,
  wr: { id: string; status: RequestStatus },
  toStatus: RequestStatus,
  actorId: string | null,
  reason?: string,
  activityType: ActivityType = "STATUS_CHANGED",
): Promise<boolean> {
  if (wr.status === toStatus || !canTransition(wr.status, toStatus)) return false;
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
      type: activityType,
      summary: `Status changed to ${internalStatusLabel(toStatus)}`,
      isCustomerVisible: notifiesCustomer(toStatus),
    },
  });
  return true;
}
