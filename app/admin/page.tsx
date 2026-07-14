import Link from "next/link";
import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { prisma } from "@/lib/db";

// Principal-admin overview. Links into user, category, settings, and audit management.
export default async function AdminPage() {
  const user = await requireCan("admin:users");

  const [userCount, activeUsers, categoryCount, activeCategories, auditCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.projectCategory.count(),
      prisma.projectCategory.count({ where: { isActive: true } }),
      prisma.auditLog.count(),
    ]);

  const cards = [
    {
      href: "/admin/users",
      title: "Users",
      body: `${activeUsers} active · ${userCount} total`,
      desc: "Invite staff, change roles, activate or deactivate accounts.",
    },
    {
      href: "/admin/categories",
      title: "Project categories",
      body: `${activeCategories} active · ${categoryCount} total`,
      desc: "Add, rename, reorder, and retire the intake category list.",
    },
    {
      href: "/admin/settings",
      title: "Settings",
      body: "Company & workflow",
      desc: "Company profile, response message, intake recipients, upload limits, workflow defaults.",
    },
    {
      href: "/admin/audit",
      title: "Audit log",
      body: `${auditCount} events`,
      desc: "Every administrative and security-relevant action, newest first.",
    },
  ];

  return (
    <>
      <AppHeader user={user} />
      <main className="max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <AdminNav />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              data-testid={`admin-card-${c.title.toLowerCase().split(" ")[0]}`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-slate-900">{c.title}</h2>
                <span className="text-xs text-slate-500">{c.body}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{c.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
