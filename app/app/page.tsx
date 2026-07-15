import Link from "next/link";
import { FilePlus2, MessageCircle, ChevronRight } from "lucide-react";
import { requirePortalUser } from "@/lib/portal/session";
import { portalHomeSummary } from "@/lib/services/portalData";
import { formatInCompanyTz } from "@/lib/utils";
import { LargeTitle } from "@/components/portal/LargeTitle";
import { StatusPill } from "@/components/portal/StatusPill";

export default async function PortalHome() {
  const session = await requirePortalUser();
  const firstName = session.name?.trim().split(/\s+/)[0] || "there";
  const { activeCount, totalCount, activePreview, recentUpdates } = await portalHomeSummary(session.sub);

  return (
    <div className="pb-10">
      <LargeTitle title={`Hi, ${firstName}`} subtitle="Welcome to your DCS Construction app" />

      <div className="space-y-4 px-5">
        <div className="rounded-2xl bg-brand-navy p-5 text-white">
          <p className="text-sm text-blue-100">Your work with DCS</p>
          <p className="mt-1 text-3xl font-bold">{activeCount} active</p>
          <p className="mt-0.5 text-sm text-blue-100">
            {totalCount} total request{totalCount === 1 ? "" : "s"} on your account
          </p>
          <Link
            href="/app/projects"
            className="mt-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/25"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/app/projects/new"
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition-transform active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <FilePlus2 className="h-6 w-6 text-brand-navy dark:text-blue-300" aria-hidden />
            <span className="text-sm font-semibold text-brand-ink dark:text-slate-100">New request</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Start a new job</span>
          </Link>
          <Link
            href="/app/messages"
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition-transform active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <MessageCircle className="h-6 w-6 text-brand-navy dark:text-blue-300" aria-hidden />
            <span className="text-sm font-semibold text-brand-ink dark:text-slate-100">Message us</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Talk to the team</span>
          </Link>
        </div>

        {totalCount === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No requests yet. Tap <span className="font-medium text-brand-navy dark:text-blue-300">New request</span> to get
            started.
          </div>
        )}

        {activePreview.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-brand-ink dark:text-slate-100">Active work</h2>
              <Link href="/app/projects" className="text-xs font-medium text-brand-navy dark:text-blue-300">
                See all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {activePreview.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/projects/${r.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-800"
                  data-testid="home-active-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink dark:text-slate-100">{r.title}</p>
                    <div className="mt-1">
                      <StatusPill status={r.customerStatus} />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-none text-slate-300 dark:text-slate-600" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}

        {recentUpdates.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-brand-ink dark:text-slate-100">Recent activity</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentUpdates.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/app/projects/${u.requestId}`}
                      className="flex gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-800"
                      data-testid="home-update-row"
                    >
                      <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-navy dark:bg-blue-400" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{u.summary}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {u.requestNumber} · {formatInCompanyTz(u.createdAt, { dateStyle: "medium" })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
