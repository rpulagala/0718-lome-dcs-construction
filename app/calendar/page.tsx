import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { listSiteVisits } from "@/lib/services/schedulingQueries";
import { assignableUsers } from "@/lib/services/requestQueries";
import { formatInCompanyTz } from "@/lib/utils";

const VISIT_BADGE: Record<string, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  RESCHEDULED: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

function dayKey(d: Date): string {
  return formatInCompanyTz(d, { weekday: "long", month: "long", day: "numeric" });
}

function timeLabel(d: Date): string {
  return formatInCompanyTz(d, { hour: "numeric", minute: "2-digit" });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const fromParam = str("from");
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const days = 30;
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const assignedToId = str("assigned") || undefined;

  const [visits, users] = await Promise.all([
    listSiteVisits({ from, to, assignedToId, includeInactive: true }),
    assignableUsers(),
  ]);

  // Group by calendar day.
  const groups = new Map<string, typeof visits>();
  for (const v of visits) {
    const key = dayKey(v.scheduledDate);
    const arr = groups.get(key) ?? [];
    arr.push(v);
    groups.set(key, arr);
  }

  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Site visit calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Showing {days} days from {formatInCompanyTz(from, { dateStyle: "medium" })}.
        </p>

        <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="text-xs text-slate-500">
            From
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Employee
            <select
              name="assigned"
              defaultValue={assignedToId ?? ""}
              className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">All employees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
            Apply
          </button>
          <Link href="/calendar" className="flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">
            Today
          </Link>
        </form>

        {visits.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No site visits scheduled in this window.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {[...groups.entries()].map(([day, dayVisits]) => (
              <section key={day} data-testid="calendar-day">
                <h2 className="text-sm font-semibold text-slate-700">{day}</h2>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {dayVisits.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{timeLabel(v.scheduledDate)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${VISIT_BADGE[v.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {v.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm text-slate-700">
                          {v.workRequest.customer.fullName} · {v.workRequest.categoryNameSnapshot}
                        </div>
                        <div className="text-xs text-slate-500">
                          {v.address ? `${v.address.street}, ${v.address.city} ${v.address.zip}` : "No address"}
                          {v.assignedTo ? ` · ${v.assignedTo.name}` : " · Unassigned"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <a
                          href={`/api/calendar/${v.id}`}
                          className="text-slate-500 hover:underline"
                        >
                          .ics
                        </a>
                        <Link href={`/requests/${v.workRequest.id}`} className="text-amber-700 hover:underline">
                          {v.workRequest.requestNumber}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
