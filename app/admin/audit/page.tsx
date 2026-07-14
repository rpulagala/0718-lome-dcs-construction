import Link from "next/link";
import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { listAuditLogs } from "@/lib/services/auditQueries";

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Signed in",
  "user.create": "User created",
  "user.update": "User updated",
  "user.role_change": "Role changed",
  "user.activate": "User activated",
  "user.deactivate": "User deactivated",
  "user.invite_resend": "Invite re-sent",
  "category.create": "Category created",
  "category.update": "Category updated",
  "category.reorder": "Category reordered",
  "category.activate": "Category activated",
  "category.deactivate": "Category deactivated",
  "category.delete": "Category deleted",
  "settings.update": "Settings updated",
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireCan("admin:audit");
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const { rows, total, totalPages } = await listAuditLogs(current, 50);

  return (
    <>
      <AppHeader user={user} />
      <main className="max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <AdminNav />

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">{total} events</p>
          <p className="text-sm text-slate-500">Page {current} of {totalPages}</p>
        </div>

        <section className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit events yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} data-testid="audit-row">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-2 text-slate-700">{r.actorName ?? "System"}</td>
                  <td className="px-4 py-2 text-slate-900">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="px-4 py-2 text-slate-500">{r.entityType}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {r.metadata ? (
                      <code className="break-all">{JSON.stringify(r.metadata)}</code>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-between">
            {current > 1 ? (
              <Link href={`/admin/audit?page=${current - 1}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                ← Newer
              </Link>
            ) : <span />}
            {current < totalPages ? (
              <Link href={`/admin/audit?page=${current + 1}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Older →
              </Link>
            ) : <span />}
          </div>
        )}
      </main>
    </>
  );
}
