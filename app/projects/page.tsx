import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { AppHeader } from "@/components/app/AppHeader";
import { listProjects } from "@/lib/services/projectQueries";
import { managerCandidates } from "@/lib/services/requestQueries";
import { projectStatusLabel } from "@/lib/domain/projectStatus";
import type { ProjectStatus } from "@/lib/generated/prisma/enums";
import { formatMoney } from "@/lib/utils";

const STATUSES: ProjectStatus[] = ["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];

const BADGE: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Cross-project view is a manager/admin capability; server-enforced.
  if (!can(user.role, "project:manage")) redirect("/dashboard");

  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = STATUSES.includes(str("status") as ProjectStatus)
    ? (str("status") as ProjectStatus)
    : undefined;
  const pmId = str("pm") || undefined;
  const page = Math.max(1, Number(str("page") ?? "1") || 1);

  const [{ rows, total, pages }, managers] = await Promise.all([
    listProjects({ status, projectManagerId: pmId, page }),
    managerCandidates(),
  ]);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">{total} project{total === 1 ? "" : "s"} total.</p>

        <form method="get" className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="text-xs text-slate-500">
            Status
            <select
              name="status"
              defaultValue={status ?? ""}
              className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{projectStatusLabel(s)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Manager
            <select
              name="pm"
              defaultValue={pmId ?? ""}
              className="mt-1 block h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">All managers</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
            Apply
          </button>
          <Link href="/projects" className="flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">
            Reset
          </Link>
        </form>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No projects match these filters.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm" data-testid="projects-table">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Manager</th>
                  <th className="px-4 py-2">Contract</th>
                  <th className="px-4 py-2">Milestones</th>
                  <th className="px-4 py-2">Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} data-testid="project-row">
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.customer.fullName}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[p.status]}`}>
                        {projectStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.projectManager?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{formatMoney(p.contractAmount)}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {p.milestones.length}/{p._count.milestones}
                    </td>
                    <td className="px-4 py-2">
                      {p.workRequest ? (
                        <Link href={`/requests/${p.workRequest.id}`} className="text-amber-700 hover:underline">
                          {p.workRequest.requestNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            {page > 1 && (
              <Link
                href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(pmId ? { pm: pmId } : {}), page: String(page - 1) }).toString()}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            )}
            <span className="text-slate-500">Page {page} of {pages}</span>
            {page < pages && (
              <Link
                href={`/projects?${new URLSearchParams({ ...(status ? { status } : {}), ...(pmId ? { pm: pmId } : {}), page: String(page + 1) }).toString()}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
