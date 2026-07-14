"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/signin" })}
      data-testid="signout"
      className="rounded-full border border-white/40 px-4 py-1.5 text-[12px] font-normal uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
