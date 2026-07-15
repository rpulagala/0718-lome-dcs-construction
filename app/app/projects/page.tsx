import { requirePortalUser } from "@/lib/portal/session";
import { LargeTitle } from "@/components/portal/LargeTitle";

export default async function PortalProjects() {
  await requirePortalUser();
  return (
    <div>
      <LargeTitle title="Projects" subtitle="Your requests and projects" />
      <div className="px-5">
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Your projects and requests will appear here — with status, milestones, photos, and estimates.
          <br />
          <span className="text-xs text-slate-400">(Coming next.)</span>
        </div>
      </div>
    </div>
  );
}
