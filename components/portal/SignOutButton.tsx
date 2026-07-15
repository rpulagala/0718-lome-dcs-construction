"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PortalSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      data-testid="portal-signout"
      onClick={async () => {
        setBusy(true);
        await fetch("/api/portal/auth/signout", { method: "POST" });
        router.replace("/app/signin");
        router.refresh();
      }}
      className="h-12 w-full rounded-xl border border-red-200 bg-white text-base font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
