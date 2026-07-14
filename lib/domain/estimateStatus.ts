import { EstimateStatus } from "@/lib/generated/prisma/enums";

/**
 * Allowed estimate status transitions. An estimate is drafted, optionally
 * reviewed internally, sent to the customer, then accepted/declined/expired.
 * A sent-or-closed estimate can be superseded by a revision (see
 * `reviseEstimate`), which flips the old one to REVISED and opens a new DRAFT.
 * ACCEPTED is terminal — it is what a project converts from.
 */
const TRANSITIONS: Record<EstimateStatus, EstimateStatus[]> = {
  DRAFT: ["UNDER_REVIEW", "SENT"],
  UNDER_REVIEW: ["DRAFT", "SENT"],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED", "REVISED"],
  ACCEPTED: [],
  DECLINED: ["REVISED"],
  EXPIRED: ["SENT", "REVISED"],
  REVISED: [],
};

export function canTransitionEstimate(
  from: EstimateStatus,
  to: EstimateStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function allowedEstimateTransitions(from: EstimateStatus): EstimateStatus[] {
  return TRANSITIONS[from];
}

/** An estimate that can still be edited (amounts/dates/notes). */
export function isEstimateEditable(status: EstimateStatus): boolean {
  return status === "DRAFT" || status === "UNDER_REVIEW";
}

/** Human-friendly label, e.g. UNDER_REVIEW -> "Under Review". */
export function estimateStatusLabel(status: EstimateStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
