import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Calendar, FileText, CheckCircle2, Circle } from "lucide-react";
import { requirePortalUser } from "@/lib/portal/session";
import { getPortalRequestDetail, type PortalProject } from "@/lib/services/portalData";
import { formatInCompanyTz } from "@/lib/utils";
import { StatusPill } from "@/components/portal/StatusPill";
import { PortalGallery } from "@/components/portal/PortalGallery";

function fmtDate(d: Date | null): string {
  return d ? formatInCompanyTz(d, { dateStyle: "medium" }) : "—";
}
function fmtDateTime(d: Date): string {
  return formatInCompanyTz(d, { dateStyle: "medium", timeStyle: "short" });
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-brand-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProjectCard({ project }: { project: PortalProject }) {
  return (
    <section className="rounded-2xl bg-brand-navy p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-100">Project</p>
          <p className="text-base font-semibold">{project.name}</p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
          {project.statusLabel}
        </span>
      </div>

      {project.milestonesTotal > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-blue-100">
            <span>Progress</span>
            <span>
              {project.milestonesDone}/{project.milestonesTotal} milestones
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${project.progressPct}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-blue-100">Planned start</dt>
          <dd>{fmtDate(project.plannedStartDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-blue-100">Planned finish</dt>
          <dd>{fmtDate(project.plannedEndDate)}</dd>
        </div>
        {project.actualStartDate && (
          <div>
            <dt className="text-xs text-blue-100">Started</dt>
            <dd>{fmtDate(project.actualStartDate)}</dd>
          </div>
        )}
        {project.actualEndDate && (
          <div>
            <dt className="text-xs text-blue-100">Completed</dt>
            <dd>{fmtDate(project.actualEndDate)}</dd>
          </div>
        )}
        {project.teamLead && (
          <div>
            <dt className="text-xs text-blue-100">Your team lead</dt>
            <dd>{project.teamLead}</dd>
          </div>
        )}
        {project.contractAmountLabel && (
          <div>
            <dt className="text-xs text-blue-100">Contract</dt>
            <dd>{project.contractAmountLabel}</dd>
          </div>
        )}
      </dl>

      {project.milestones.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/15 pt-4" data-testid="milestones">
          {project.milestones.map((m) => (
            <li key={m.id} className="flex items-start gap-2 text-sm">
              {m.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 flex-none text-white/40" aria-hidden />
              )}
              <div className="min-w-0">
                <p className={m.done ? "text-blue-100 line-through" : "font-medium"}>{m.title}</p>
                {m.dueAt && !m.done && (
                  <p className="text-xs text-blue-200">Due {fmtDate(m.dueAt)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function PortalRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePortalUser();
  const { id } = await params;
  const detail = await getPortalRequestDetail(session.sub, id);
  if (!detail) notFound();

  const addr = detail.address;

  return (
    <div className="pb-10">
      <div className="px-5 pt-6">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Projects
        </Link>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-brand-ink">
          {detail.title}
        </h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={detail.customerStatus} />
          <span className="text-xs text-slate-400">{detail.requestNumber}</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Submitted {fmtDate(detail.submittedAt)}</p>
      </div>

      <div className="mt-5 space-y-4 px-5">
        {detail.project && <ProjectCard project={detail.project} />}

        {detail.photos.length > 0 && (
          <Section title="Photos">
            <PortalGallery photos={detail.photos} />
          </Section>
        )}

        <Section title="Details" icon={<FileText className="h-4 w-4 text-slate-400" aria-hidden />}>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p>
          <div className="mt-3 flex items-start gap-1.5 text-sm text-slate-500">
            <MapPin className="mt-0.5 h-4 w-4 flex-none text-slate-400" aria-hidden />
            <span>
              {addr.street}
              {addr.unit ? `, ${addr.unit}` : ""}
              <br />
              {addr.city}, {addr.state} {addr.zip}
            </span>
          </div>
        </Section>

        {detail.estimates.length > 0 && (
          <Section title="Estimates">
            <ul className="space-y-3">
              {detail.estimates.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-slate-200 p-3"
                  data-testid="estimate-item"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-brand-ink">{e.amountLabel}</span>
                    <span className="text-xs font-medium text-amber-700">{e.statusLabel}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {e.estimateNumber}
                    {e.sentAt ? ` · Sent ${fmtDate(e.sentAt)}` : ""}
                    {e.expiresAt ? ` · Expires ${fmtDate(e.expiresAt)}` : ""}
                  </p>
                  {e.customerNotes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{e.customerNotes}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Accepting or declining an estimate in the app is coming soon.
            </p>
          </Section>
        )}

        {detail.siteVisits.length > 0 && (
          <Section
            title="Site visits"
            icon={<Calendar className="h-4 w-4 text-slate-400" aria-hidden />}
          >
            <ul className="space-y-3">
              {detail.siteVisits.map((v) => (
                <li key={v.id} className="text-sm" data-testid="site-visit">
                  <p className="font-medium text-brand-ink">{fmtDateTime(v.scheduledDate)}</p>
                  {v.customerInstructions && (
                    <p className="mt-0.5 text-slate-600">{v.customerInstructions}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {detail.updates.length > 0 && (
          <Section title="Updates">
            <ol className="space-y-3">
              {detail.updates.map((u) => (
                <li key={u.id} className="flex gap-3 text-sm" data-testid="update-item">
                  <div className="mt-1 h-2 w-2 flex-none rounded-full bg-brand-navy" aria-hidden />
                  <div>
                    <p className="text-slate-700">{u.summary}</p>
                    <p className="text-xs text-slate-400">{fmtDateTime(u.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {detail.notes.length > 0 && (
          <Section title="Notes from the team">
            <ul className="space-y-3">
              {detail.notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm" data-testid="note-item">
                  <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {n.author} · {fmtDate(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
