import { RequestStatus } from "@/lib/generated/prisma/enums";

/**
 * Allowed status transitions. Terminal states (COMPLETED, DECLINED, CANCELLED)
 * may still move to ARCHIVED. Invalid transitions are rejected server-side.
 */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ["REVIEWING", "NEEDS_MORE_INFORMATION", "CONTACTED", "DECLINED", "CANCELLED"],
  REVIEWING: [
    "NEEDS_MORE_INFORMATION",
    "CONTACTED",
    "SITE_VISIT_TO_SCHEDULE",
    "DECLINED",
    "CANCELLED",
  ],
  NEEDS_MORE_INFORMATION: ["REVIEWING", "CONTACTED", "CANCELLED"],
  CONTACTED: ["SITE_VISIT_TO_SCHEDULE", "NEEDS_MORE_INFORMATION", "DECLINED", "CANCELLED"],
  SITE_VISIT_TO_SCHEDULE: ["SITE_VISIT_SCHEDULED", "CANCELLED"],
  SITE_VISIT_SCHEDULED: ["SITE_VISIT_COMPLETED", "SITE_VISIT_TO_SCHEDULE", "CANCELLED"],
  SITE_VISIT_COMPLETED: ["ESTIMATE_IN_PROGRESS", "DECLINED", "CANCELLED"],
  ESTIMATE_IN_PROGRESS: ["ESTIMATE_SENT", "CANCELLED"],
  ESTIMATE_SENT: ["CUSTOMER_DECISION_PENDING", "APPROVED", "DECLINED", "CANCELLED"],
  CUSTOMER_DECISION_PENDING: ["APPROVED", "DECLINED", "CANCELLED"],
  APPROVED: ["PROJECT_SCHEDULED", "CANCELLED"],
  PROJECT_SCHEDULED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["ARCHIVED"],
  DECLINED: ["ARCHIVED", "REVIEWING"],
  CANCELLED: ["ARCHIVED", "REVIEWING"],
  ARCHIVED: [],
};

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: RequestStatus): RequestStatus[] {
  return TRANSITIONS[from];
}

/** Status changes that should trigger a customer notification. */
const CUSTOMER_NOTIFY: ReadonlySet<RequestStatus> = new Set<RequestStatus>([
  "NEEDS_MORE_INFORMATION",
  "SITE_VISIT_SCHEDULED",
  "ESTIMATE_SENT",
  "PROJECT_SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export function notifiesCustomer(to: RequestStatus): boolean {
  return CUSTOMER_NOTIFY.has(to);
}
