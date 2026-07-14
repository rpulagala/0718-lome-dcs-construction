"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/signin" })}
      data-testid="signout"
      className="rounded-md border border-blue-300/50 px-3 py-1.5 text-sm font-medium text-blue-50 hover:bg-blue-800"
    >
      Sign out
    </button>
  );
}
