import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { listCategories } from "@/lib/services/categoryAdmin";

export default async function AdminCategoriesPage() {
  const user = await requireCan("admin:categories");
  const categories = await listCategories();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <AdminNav />
        <CategoriesManager categories={categories} />
      </main>
    </>
  );
}
