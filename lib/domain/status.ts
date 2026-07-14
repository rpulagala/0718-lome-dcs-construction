import { RequestStatus } from "@/lib/generated/prisma/enums";

/** Customer-facing labels — a simplified projection of internal status. */
export type CustomerStatus =
  | "Request Received"
  | "Under Review"
  | "Action Needed"
  | "Site Visit Scheduled"
  | "Estimate Being Prepared"
  | "Estimate Sent"
  | "Project Scheduled"
  | "Work in Progress"
  | "Completed"
  | "Closed";

const MAP: Record<RequestStatus, CustomerStatus> = {
  NEW: "Request Received",
  REVIEWING: "Under Review",
  NEEDS_MORE_INFORMATION: "Action Needed",
  CONTACTED: "Under Review",
  SITE_VISIT_TO_SCHEDULE: "Under Review",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  SITE_VISIT_COMPLETED: "Estimate Being Prepared",
  ESTIMATE_IN_PROGRESS: "Estimate Being Prepared",
  ESTIMATE_SENT: "Estimate Sent",
  CUSTOMER_DECISION_PENDING: "Estimate Sent",
  APPROVED: "Project Scheduled",
  PROJECT_SCHEDULED: "Project Scheduled",
  IN_PROGRESS: "Work in Progress",
  ON_HOLD: "Work in Progress",
  COMPLETED: "Completed",
  DECLINED: "Closed",
  CANCELLED: "Closed",
  ARCHIVED: "Closed",
};

export function toCustomerStatus(status: RequestStatus): CustomerStatus {
  return MAP[status];
}

/** Human-friendly internal label, e.g. NEEDS_MORE_INFORMATION -> "Needs More Information". */
export function internalStatusLabel(status: RequestStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
