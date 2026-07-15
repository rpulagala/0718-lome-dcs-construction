import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePortalUser } from "@/lib/portal/session";
import { listPortalRequests } from "@/lib/services/portalData";
import { ProjectsList } from "@/components/portal/ProjectsList";

export default async function PortalProjects() {
  const session = await requirePortalUser();
  const { active, completed } = await listPortalRequests(session.sub);
  const empty = active.length === 0 && completed.length === 0;

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between px-5 pt-8 pb-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-brand-ink dark:text-slate-100">Projects</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Your requests and projects</p>
        </div>
        <Link
          href="/app/projects/new"
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-navy px-3.5 py-2 text-sm font-semibold text-white"
          data-testid="new-request-cta"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New
        </Link>
      </div>

      {empty ? (
        <div className="px-5">
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">You don&apos;t have any requests yet.</p>
            <Link
              href="/app/projects/new"
              className="mt-4 inline-block rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Start a request
            </Link>
          </div>
        </div>
      ) : (
        <ProjectsList active={active} completed={completed} />
      )}
    </div>
  );
}
