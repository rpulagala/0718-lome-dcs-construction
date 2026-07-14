import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  PRINCIPAL_ADMIN: "Principal Administrator",
};

export function AppHeader({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  const isAdmin = user.role === "PRINCIPAL_ADMIN";
  const isManager = isAdmin || user.role === "MANAGER";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-bold text-slate-900">
            DCS<span className="text-amber-600"> Console</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/requests" className="text-slate-600 hover:text-slate-900">
              Requests
            </Link>
            <Link href="/calendar" className="text-slate-600 hover:text-slate-900">
              Calendar
            </Link>
            {isManager && (
              <Link href="/projects" className="text-slate-600 hover:text-slate-900">
                Projects
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-slate-600 hover:text-slate-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            {user.name} · {ROLE_LABEL[user.role] ?? user.role}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
