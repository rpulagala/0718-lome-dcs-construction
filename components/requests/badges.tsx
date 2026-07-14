import type { RequestStatus, Priority } from "@/lib/generated/prisma/enums";
import { internalStatusLabel } from "@/lib/domain/status";

const STATUS_COLORS: Record<RequestStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  REVIEWING: "bg-blue-100 text-blue-800",
  NEEDS_MORE_INFORMATION: "bg-amber-100 text-amber-800",
  CONTACTED: "bg-indigo-100 text-indigo-800",
  SITE_VISIT_TO_SCHEDULE: "bg-purple-100 text-purple-800",
  SITE_VISIT_SCHEDULED: "bg-purple-100 text-purple-800",
  SITE_VISIT_COMPLETED: "bg-teal-100 text-teal-800",
  ESTIMATE_IN_PROGRESS: "bg-cyan-100 text-cyan-800",
  ESTIMATE_SENT: "bg-cyan-100 text-cyan-800",
  CUSTOMER_DECISION_PENDING: "bg-cyan-100 text-cyan-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PROJECT_SCHEDULED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  DECLINED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-slate-100 text-slate-700",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {internalStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}
    >
      {label}
    </span>
  );
}
