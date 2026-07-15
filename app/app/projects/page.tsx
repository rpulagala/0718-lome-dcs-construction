import { requirePortalUser } from "@/lib/portal/session";
import { listPortalRequests } from "@/lib/services/portalData";
import { LargeTitle } from "@/components/portal/LargeTitle";
import { ProjectsList } from "@/components/portal/ProjectsList";

export default async function PortalProjects() {
  const session = await requirePortalUser();
  const { active, completed } = await listPortalRequests(session.sub);

  return (
    <div className="pb-10">
      <LargeTitle title="Projects" subtitle="Your requests and projects" />
      {active.length === 0 && completed.length === 0 ? (
        <div className="px-5">
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            You don&apos;t have any requests yet.
            <br />
            <span className="text-xs text-slate-400">New requests will appear here.</span>
          </div>
        </div>
      ) : (
        <ProjectsList active={active} completed={completed} />
      )}
    </div>
  );
}
