"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondToEstimateAction } from "@/app/app/projects/[id]/actions";
import type { EstimateDecision } from "@/lib/services/portalEstimates";

/**
 * Accept / decline controls for a SENT estimate on the portal request detail.
 * Two-step confirm (accepting an estimate starts a project), pending state, and
 * a router.refresh() on success so the detail re-renders with the new project /
 * updated estimate status.
 */
export function EstimateActions({
  estimateId,
  amountLabel,
}: {
  estimateId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<EstimateDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: EstimateDecision) {
    setError(null);
    startTransition(async () => {
      const res = await respondToEstimateAction(estimateId, decision);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setConfirm(null);
        return;
      }
      router.refresh();
    });
  }

  if (confirm) {
    const accepting = confirm === "accept";
    return (
      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800" data-testid="estimate-confirm">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {accepting
            ? `Accept this estimate for ${amountLabel}? This starts your project and the team will be notified.`
            : "Decline this estimate? You can still message the team if you have questions."}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(confirm)}
            data-testid="estimate-confirm-yes"
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              accepting ? "bg-emerald-600" : "bg-brand-red"
            }`}
          >
            {pending ? "Working…" : accepting ? "Yes, accept" : "Yes, decline"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirm(null)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirm("accept")}
          data-testid="estimate-accept"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <Check className="h-4 w-4" aria-hidden />
          Accept
        </button>
        <button
          type="button"
          onClick={() => setConfirm("decline")}
          data-testid="estimate-decline"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-transform active:scale-[0.98] dark:border-slate-700 dark:text-slate-300"
        >
          <X className="h-4 w-4" aria-hidden />
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
