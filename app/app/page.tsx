import Link from "next/link";
import { FilePlus2, MessageCircle } from "lucide-react";
import { requirePortalUser } from "@/lib/portal/session";
import { prisma } from "@/lib/db";
import { LargeTitle } from "@/components/portal/LargeTitle";
import type { RequestStatus } from "@/lib/generated/prisma/enums";

const ACTIVE: RequestStatus[] = [
  "NEW", "REVIEWING", "NEEDS_MORE_INFORMATION", "CONTACTED", "SITE_VISIT_TO_SCHEDULE",
  "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED", "ESTIMATE_IN_PROGRESS", "ESTIMATE_SENT",
  "CUSTOMER_DECISION_PENDING", "APPROVED", "PROJECT_SCHEDULED", "IN_PROGRESS", "ON_HOLD",
];

export default async function PortalHome() {
  const session = await requirePortalUser();
  const firstName = (session.name?.trim().split(/\s+/)[0]) || "there";

  const [total, active] = await Promise.all([
    prisma.workRequest.count({ where: { customerAccountId: session.sub } }),
    prisma.workRequest.count({ where: { customerAccountId: session.sub, status: { in: ACTIVE } } }),
  ]);

  return (
    <div className="pb-8">
      <LargeTitle title={`Hi, ${firstName}`} subtitle="Welcome to your DCS Construction app" />

      <div className="px-5">
        <div className="rounded-2xl bg-brand-navy p-5 text-white">
          <p className="text-sm text-blue-100">Your work with DCS</p>
          <p className="mt-1 text-3xl font-bold">{active} active</p>
          <p className="mt-0.5 text-sm text-blue-100">
            {total} total request{total === 1 ? "" : "s"} on your account
          </p>
          <Link
            href="/app/projects"
            className="mt-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
          >
            View all →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/app/projects" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <FilePlus2 className="h-6 w-6 text-brand-navy" aria-hidden />
            <span className="text-sm font-semibold text-brand-ink">New request</span>
            <span className="text-xs text-slate-500">Start a new job</span>
          </Link>
          <Link href="/app/messages" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <MessageCircle className="h-6 w-6 text-brand-navy" aria-hidden />
            <span className="text-sm font-semibold text-brand-ink">Message us</span>
            <span className="text-xs text-slate-500">Talk to the team</span>
          </Link>
        </div>

        {total === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No requests yet. Tap <span className="font-medium text-brand-navy">New request</span> to get started.
          </div>
        )}

        <p className="mt-6 px-1 text-xs text-slate-400">
          Full project tracking, estimates, and messaging are coming to this app.
        </p>
      </div>
    </div>
  );
}
