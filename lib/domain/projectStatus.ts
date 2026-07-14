import { ProjectStatus, RequestStatus } from "@/lib/generated/prisma/enums";

/**
 * Allowed project status transitions. A project is planned, worked, optionally
 * paused, then completed or cancelled. COMPLETED/CANCELLED are terminal.
 */
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionProject(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function allowedProjectTransitions(from: ProjectStatus): ProjectStatus[] {
  return TRANSITIONS[from];
}

export function projectStatusLabel(status: ProjectStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The WorkRequest status a project status should drive the parent request to.
 * Applied best-effort through the guarded request state machine so the request
 * timeline mirrors project progress.
 */
export function requestStatusForProject(status: ProjectStatus): RequestStatus {
  switch (status) {
    case "PLANNED":
      return "PROJECT_SCHEDULED";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "ON_HOLD":
      return "ON_HOLD";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
  }
}
