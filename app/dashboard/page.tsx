import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { dashboardStats } from "@/lib/services/requestQueries";

function StatCard({ label, value, href, accent }: { label: string; value: number; href: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 transition hover:shadow-sm ${
        accent && value > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`text-2xl font-bold ${accent && value > 0 ? "text-red-700" : "text-slate-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await dashboardStats();

  return (
    <>
      <AppHeader user={user} />
      <main className="max-w-7xl px-6 py-8" data-testid="dashboard-overview">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <Link href="/requests" className="text-sm font-medium text-amber-700 hover:underline">
            View all requests →
          </Link>
        </div>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Summary">
          <StatCard label="New requests" value={stats.newRequests} href="/requests?status=NEW" />
          <StatCard label="Awaiting first contact" value={stats.awaitingFirstContact} href="/requests?status=NEW" />
          <StatCard label="Site visits to schedule" value={stats.siteVisitsToSchedule} href="/requests?status=SITE_VISIT_TO_SCHEDULE" />
          <StatCard label="Site visits today" value={stats.siteVisitsToday} href="/calendar" />
          <StatCard label="Estimates pending" value={stats.estimatesPending} href="/requests?status=ESTIMATE_SENT" />
          <StatCard label="Active projects" value={stats.activeProjects} href="/projects" />
          <StatCard label="Overdue for response" value={stats.overdue} href="/requests?overdue=1" accent />
          <StatCard label="Completed this month" value={stats.completedThisMonth} href="/requests?status=COMPLETED" />
        </section>
      </main>
    </>
  );
}
