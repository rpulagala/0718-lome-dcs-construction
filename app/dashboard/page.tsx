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

        {/* What is a Request vs a Project, and how one becomes the other */}
        <section
          className="mt-8 rounded-lg border border-slate-200 bg-white p-5"
          aria-label="Requests and projects explained"
        >
          <h2 className="text-sm font-semibold text-slate-900">Requests &amp; Projects</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-900">A Request</p>
              <p className="mt-1 text-sm text-slate-600">
                A customer inquiry — <span className="font-medium">every job starts here</span> when
                someone submits the intake form. It tracks the customer, category, photos, site
                visits, notes, communications, and estimates as it moves through the pipeline. Not
                every request becomes a project (some are declined or cancelled).
              </p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">A Project</p>
              <p className="mt-1 text-sm text-slate-600">
                The construction work being delivered. It&rsquo;s created once the customer{" "}
                <span className="font-medium">accepts an estimate</span>, adding a project manager,
                contract amount, planned/actual dates, and milestones to track the build to
                completion.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              How a request becomes a project
            </p>
            <ol className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {[
                "Request submitted",
                "Reviewed & contacted",
                "Site visit",
                "Estimate sent",
                "Customer accepts",
                "Project created",
              ].map((step, i, arr) => (
                <li key={step} className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      i === arr.length - 1
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span aria-hidden className="text-slate-400">→</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
