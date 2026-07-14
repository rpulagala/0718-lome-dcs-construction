import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { AppHeader } from "@/components/app/AppHeader";
import { StatusBadge, PriorityBadge } from "@/components/requests/badges";
import { ManagePanel } from "@/components/requests/ManagePanel";
import { NoteForm } from "@/components/requests/NoteForm";
import { InternalGallery } from "@/components/requests/InternalGallery";
import { getRequestDetail, assignableUsers } from "@/lib/services/requestQueries";
import { allowedTransitions } from "@/lib/domain/statusMachine";
import { toCustomerStatus, internalStatusLabel } from "@/lib/domain/status";
import { isOverdue } from "@/lib/domain/businessHours";

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const r = await getRequestDetail(id);
  if (!r) notFound();

  const overdue = isOverdue(r.responseDueAt, r.firstContactedAt);
  const internalNotes = r.notes.filter((n) => n.visibility === "INTERNAL");
  const customerNotes = r.notes.filter((n) => n.visibility === "CUSTOMER_VISIBLE");

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
              ← Back to dashboard
            </Link>
            <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-slate-900">
              {r.requestNumber}
              <StatusBadge status={r.status} />
              <PriorityBadge priority={r.priority} />
              {overdue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" data-testid="overdue-flag">
                  Overdue
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer-facing status: {toCustomerStatus(r.status)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card title="Customer">
                <dl>
                  <Row label="Name" value={r.customer.fullName} />
                  <Row label="Phone" value={r.customer.phone} />
                  <Row label="Email" value={r.customer.email} />
                  <Row label="Preferred" value={r.preferredContact} />
                </dl>
              </Card>
              <Card title="Location">
                <dl>
                  <Row label="Street" value={`${r.address.street}${r.address.unit ? `, ${r.address.unit}` : ""}`} />
                  <Row label="City" value={`${r.address.city}, ${r.address.state} ${r.address.zip}`} />
                  <Row
                    label="Map"
                    value={
                      <a
                        className="text-amber-700 hover:underline"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.address.street}, ${r.address.city}, ${r.address.state} ${r.address.zip}`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    }
                  />
                </dl>
              </Card>
            </div>

            <Card title="Project">
              <dl>
                <Row label="Category" value={r.categoryNameSnapshot} />
                <Row label="Budget" value={r.budgetRange || "—"} />
                <Row label="Timeframe" value={r.desiredTimeframe || "—"} />
                <Row label="Referral" value={r.referralSource || "—"} />
                <Row label="Submitted" value={fmt(r.createdAt)} />
                <Row label="Response due" value={fmt(r.responseDueAt)} />
              </dl>
              <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-700">
                {r.description}
              </p>
            </Card>

            <Card title={`Photos (${r.photos.length})`}>
              <InternalGallery photos={r.photos.map((p) => ({ id: p.id, storageKey: p.storageKey, fileName: p.fileName }))} />
            </Card>

            <NoteForm requestId={r.id} />

            <Card title="Internal notes">
              {internalNotes.length === 0 ? (
                <p className="text-sm text-slate-400">No internal notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {internalNotes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <div className="text-slate-800">{n.body}</div>
                      <div className="text-xs text-slate-400">{n.author.name} · {fmt(n.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {customerNotes.length > 0 && (
              <Card title="Customer-visible notes">
                <ul className="space-y-3">
                  {customerNotes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <div className="text-slate-800">{n.body}</div>
                      <div className="text-xs text-slate-400">{n.author.name} · {fmt(n.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Activity timeline">
              <ol className="space-y-2" data-testid="timeline">
                {r.activities.map((a) => (
                  <li key={a.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-700">
                      {a.summary}
                      {a.isCustomerVisible && (
                        <span className="ml-2 rounded bg-slate-100 px-1 text-[10px] text-slate-500">customer-visible</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-400">{fmt(a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ManagePanel
              requestId={r.id}
              currentStatus={r.status}
              currentPriority={r.priority}
              currentAssigneeId={r.assignedTo?.id ?? null}
              allowedStatuses={allowedTransitions(r.status)}
              users={await assignableUsers()}
              canAssign={can(user.role, "request:assign")}
            />

            <Card title="At a glance">
              <dl>
                <Row label="Assigned to" value={r.assignedTo?.name ?? "Unassigned"} />
                <Row label="First contacted" value={fmt(r.firstContactedAt)} />
                <Row label="Site visits" value={r.siteVisits.length} />
                <Row label="Estimates" value={r.estimates.length} />
              </dl>
            </Card>

            <Card title="Status history">
              <ul className="space-y-2 text-sm">
                {r.statusHistory.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span className="text-slate-700">
                      {s.fromStatus ? `${internalStatusLabel(s.fromStatus)} → ` : ""}
                      {internalStatusLabel(s.toStatus)}
                      {s.changedBy && <span className="text-slate-400"> · {s.changedBy.name}</span>}
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-400">{fmt(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {r.assignmentHistory.length > 0 && (
              <Card title="Assignment history">
                <ul className="space-y-2 text-sm">
                  {r.assignmentHistory.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span className="text-slate-700">
                        {a.assignedTo?.name ?? "Unassigned"}
                        {a.assignedBy && <span className="text-slate-400"> · by {a.assignedBy.name}</span>}
                      </span>
                      <span className="whitespace-nowrap text-xs text-slate-400">{fmt(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
