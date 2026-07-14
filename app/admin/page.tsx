import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";

// Principal-admin area. Full user/category/settings/audit management lands in Phase 5.
export default async function AdminPage() {
  const user = await requireCan("admin:users");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-slate-500">
          User management, project categories, company settings, and the audit log
          arrive in Phase 5. Access here is already restricted to principal
          administrators (server-enforced).
        </div>
      </main>
    </>
  );
}
