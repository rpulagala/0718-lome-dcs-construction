import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { UsersManager } from "@/components/admin/UsersManager";
import { listUsers } from "@/lib/services/userAdmin";

export default async function AdminUsersPage() {
  const user = await requireCan("admin:users");
  const users = await listUsers();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <AdminNav />
        <UsersManager currentUserId={user.id} users={users} />
      </main>
    </>
  );
}
