import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  PRINCIPAL_ADMIN: "Principal Administrator",
};

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500" data-testid="dashboard-user">
            Signed in as {user.name} · {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-slate-500">
        Work-request dashboard arrives in Phase 3. Foundation, auth, and the data
        model are in place.
      </div>
    </main>
  );
}
