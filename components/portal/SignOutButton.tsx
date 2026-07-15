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
      className="h-12 w-full rounded-xl border border-red-200 bg-white text-base font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
