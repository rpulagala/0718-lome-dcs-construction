"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/** Portal error boundary — friendly retry UI for any /app screen that throws. */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console; server errors are already logged server-side.
    console.error("portal.error", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center"
      data-testid="portal-error"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-bold text-brand-ink dark:text-slate-100">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        We hit a snag loading this screen. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-full bg-brand-navy px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
