import { requirePortalUser } from "@/lib/portal/session";
import { LargeTitle } from "@/components/portal/LargeTitle";

export default async function PortalMessages() {
  await requirePortalUser();
  return (
    <div>
      <LargeTitle title="Messages" subtitle="Chat with the DCS team" />
      <div className="px-5">
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Two-way messaging with your DCS Construction team will live here.
          <br />
          <span className="text-xs text-slate-400">(Coming next.)</span>
        </div>
      </div>
    </div>
  );
}
