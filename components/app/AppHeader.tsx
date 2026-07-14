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
    <header className="border-b border-blue-950 bg-blue-900">
      <div className="flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-bold text-white">
            DCS<span className="text-amber-400"> Console</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-blue-100 hover:text-white">
              Dashboard
            </Link>
            <Link href="/requests" className="text-blue-100 hover:text-white">
              Requests
            </Link>
            <Link href="/calendar" className="text-blue-100 hover:text-white">
              Calendar
            </Link>
            {isManager && (
              <Link href="/projects" className="text-blue-100 hover:text-white">
                Projects
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-blue-100 hover:text-white">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-200">
            {user.name} · {ROLE_LABEL[user.role] ?? user.role}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
