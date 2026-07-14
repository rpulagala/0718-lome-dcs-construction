import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  PRINCIPAL_ADMIN: "Principal Administrator",
};

const navLink =
  "text-[13px] font-normal uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white";

export function AppHeader({
  user,
}: {
  user: { name?: string | null; role: string };
}) {
  const isAdmin = user.role === "PRINCIPAL_ADMIN";
  const isManager = isAdmin || user.role === "MANAGER";
  return (
    <header className="bg-brand-navy font-brand">
      <div className="flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-[0.22em] text-white"
          >
            DCS<span className="font-light text-white/70"> CONSOLE</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className={navLink}>Dashboard</Link>
            <Link href="/requests" className={navLink}>Requests</Link>
            <Link href="/calendar" className={navLink}>Calendar</Link>
            {isManager && <Link href="/projects" className={navLink}>Projects</Link>}
            {isAdmin && <Link href="/admin" className={navLink}>Admin</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-light tracking-wide text-white/70">
            {user.name} · {ROLE_LABEL[user.role] ?? user.role}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
