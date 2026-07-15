import { requirePortalUser } from "@/lib/portal/session";
import { LargeTitle } from "@/components/portal/LargeTitle";
import { PortalSignOutButton } from "@/components/portal/SignOutButton";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-brand-ink">{value}</span>
    </div>
  );
}

export default async function PortalProfile() {
  const session = await requirePortalUser();
  return (
    <div className="pb-8">
      <LargeTitle title="Profile" />
      <div className="space-y-5 px-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Row label="Name" value={session.name || "—"} />
          <Row label="Email" value={session.email} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-medium text-brand-ink">Need help?</p>
          <p className="mt-1">
            Call <a href="tel:4155150470" className="text-brand-navy hover:underline">415-515-0470</a> or email{" "}
            <a href="mailto:dancanest@gmail.com" className="text-brand-navy hover:underline">dancanest@gmail.com</a>.
          </p>
        </div>

        <PortalSignOutButton />
      </div>
    </div>
  );
}
