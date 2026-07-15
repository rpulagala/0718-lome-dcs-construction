"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, MessageCircle, User } from "lucide-react";

const TABS = [
  { href: "/app", label: "Home", Icon: Home, isActive: (p: string) => p === "/app" },
  { href: "/app/projects", label: "Projects", Icon: LayoutGrid, isActive: (p: string) => p.startsWith("/app/projects") },
  { href: "/app/messages", label: "Messages", Icon: MessageCircle, isActive: (p: string) => p.startsWith("/app/messages") },
  { href: "/app/profile", label: "Profile", Icon: User, isActive: (p: string) => p.startsWith("/app/profile") },
];

export function TabBar() {
  const pathname = usePathname();
  if (pathname === "/app/signin") return null;

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/85"
    >
      <ul className="flex">
        {TABS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy ${
                  active
                    ? "text-brand-navy dark:text-blue-300"
                    : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
