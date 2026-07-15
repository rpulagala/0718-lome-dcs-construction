import Link from "next/link";
import { Compass } from "lucide-react";

/** Portal 404 — shown when a request/project/thread isn't found or isn't yours. */
export default function PortalNotFound() {
  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center"
      data-testid="portal-not-found"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/25">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-lg font-bold text-brand-ink dark:text-slate-100">Not found</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        We couldn&apos;t find that page, or it isn&apos;t on your account.
      </p>
      <Link
        href="/app"
        className="mt-6 h-11 rounded-full bg-brand-navy px-6 text-sm font-semibold leading-[2.75rem] text-white transition-transform active:scale-[0.98]"
      >
        Back to Home
      </Link>
    </div>
  );
}
