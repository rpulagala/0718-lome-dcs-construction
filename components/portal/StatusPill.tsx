import type { CustomerStatus } from "@/lib/domain/status";

const TONE: Record<CustomerStatus, string> = {
  "Request Received": "bg-slate-100 text-slate-700",
  "Under Review": "bg-blue-100 text-blue-700",
  "Action Needed": "bg-orange-100 text-orange-700",
  "Site Visit Scheduled": "bg-sky-100 text-sky-700",
  "Estimate Being Prepared": "bg-indigo-100 text-indigo-700",
  "Estimate Sent": "bg-amber-100 text-amber-800",
  "Project Scheduled": "bg-violet-100 text-violet-700",
  "Work in Progress": "bg-emerald-100 text-emerald-700",
  Completed: "bg-emerald-600 text-white",
  Closed: "bg-slate-200 text-slate-600",
};

/** Customer-facing status badge for the client app. */
export function StatusPill({ status, className = "" }: { status: CustomerStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status]} ${className}`}
    >
      {status}
    </span>
  );
}
