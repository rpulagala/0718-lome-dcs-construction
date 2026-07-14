import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { StatusBadge, PriorityBadge } from "@/components/requests/badges";
import {
  dashboardStats,
  listRequests,
  assignableUsers,
  type ListParams,
} from "@/lib/services/requestQueries";
import { prisma } from "@/lib/db";
import type { RequestStatus, Priority } from "@/lib/generated/prisma/enums";

const STATUSES: RequestStatus[] = [
  "NEW", "REVIEWING", "NEEDS_MORE_INFORMATION", "CONTACTED", "SITE_VISIT_TO_SCHEDULE",
  "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED", "ESTIMATE_IN_PROGRESS", "ESTIMATE_SENT",
  "CUSTOMER_DECISION_PENDING", "APPROVED", "PROJECT_SCHEDULED", "IN_PROGRESS", "ON_HOLD",
  "COMPLETED", "DECLINED", "CANCELLED", "ARCHIVED",
];
const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const params: ListParams = {
    q: str("q"),
    status: (str("status") as RequestStatus) || undefined,
    categoryId: str("category") || undefined,
    assignedToId: str("assigned") || undefined,
    priority: (str("priority") as Priority) || undefined,
    hasPhotos: sp["photos"] === "1",
    unassigned: sp["unassigned"] === "1",
    overdue: sp["overdue"] === "1",
    page: str("page") ? Number(str("page")) : 1,
  };

  const [stats, list, categories, users] = await Promise.all([
    dashboardStats(),
    listRequests(params),
    prisma.projectCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    assignableUsers(),
  ]);

  const buildPage = (p: number) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") usp.set(k, v);
    usp.set("page", String(p));
    return `/dashboard?${usp.toString()}`;
  };

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Summary">
          <StatCard label="New requests" value={stats.newRequests} href="/dashboard?status=NEW" />
          <StatCard label="Awaiting first contact" value={stats.awaitingFirstContact} href="/dashboard?status=NEW" />
          <StatCard label="Site visits to schedule" value={stats.siteVisitsToSchedule} href="/dashboard?status=SITE_VISIT_TO_SCHEDULE" />
          <StatCard label="Site visits today" value={stats.siteVisitsToday} href="/dashboard" />
          <StatCard label="Estimates pending" value={stats.estimatesPending} href="/dashboard?status=ESTIMATE_SENT" />
          <StatCard label="Active projects" value={stats.activeProjects} href="/dashboard" />
          <StatCard label="Overdue for response" value={stats.overdue} href="/dashboard?overdue=1" accent />
          <StatCard label="Completed this month" value={stats.completedThisMonth} href="/dashboard?status=COMPLETED" />
        </section>

        {/* Filters */}
        <form method="get" className="mt-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search #, name, email, phone, address…"
            data-testid="dash-search"
            className="h-9 rounded-md border border-slate-300 px-3 text-sm sm:col-span-2 lg:col-span-2"
          />
          <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select name="category" defaultValue={params.categoryId ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="assigned" defaultValue={params.assignedToId ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Any assignee</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select name="priority" defaultValue={params.priority ?? ""} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" name="photos" value="1" defaultChecked={params.hasPhotos} /> With photos
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" name="unassigned" value="1" defaultChecked={params.unassigned} /> Unassigned
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" name="overdue" value="1" defaultChecked={params.overdue} /> Overdue
          </label>
          <div className="flex gap-2">
            <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
              Apply
            </button>
            <Link href="/dashboard" className="flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">
              Reset
            </Link>
          </div>
        </form>

        {/* Results */}
        <p className="mt-6 text-sm text-slate-500" data-testid="results-count">
          {list.total} request{list.total === 1 ? "" : "s"}
        </p>

        {list.rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No requests match your filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="mt-3 hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">City/ZIP</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Visit</th>
                    <th className="px-3 py-2">Photos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50" data-testid="request-row">
                      <td className="px-3 py-2">
                        <Link href={`/requests/${r.id}`} className="font-medium text-slate-900 hover:underline">
                          {r.requestNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{r.customer.fullName}</td>
                      <td className="px-3 py-2 text-slate-500">{fmtDate(r.createdAt)}</td>
                      <td className="px-3 py-2">{r.category.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.address.city}, {r.address.zip}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-3 py-2 text-slate-600">{r.assignedTo?.name ?? <span className="text-amber-600">Unassigned</span>}</td>
                      <td className="px-3 py-2 text-slate-500">{r.siteVisits[0] ? fmtDate(r.siteVisits[0].scheduledDate) : "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{r._count.photos > 0 ? `📷 ${r._count.photos}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="mt-3 space-y-3 md:hidden">
              {list.rows.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/requests/${r.id}`} className="font-medium text-slate-900 hover:underline">
                      {r.requestNumber}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{r.customer.fullName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {r.category.name} · {r.address.city}, {r.address.zip} · {fmtDate(r.createdAt)}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <PriorityBadge priority={r.priority} />
                    <span>{r.assignedTo?.name ?? "Unassigned"}</span>
                    {r._count.photos > 0 && <span>📷 {r._count.photos}</span>}
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {list.pages > 1 && (
              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-slate-500">Page {list.page} of {list.pages}</span>
                <div className="flex gap-2">
                  {list.page > 1 && (
                    <Link href={buildPage(list.page - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Previous</Link>
                  )}
                  {list.page < list.pages && (
                    <Link href={buildPage(list.page + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Next</Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
