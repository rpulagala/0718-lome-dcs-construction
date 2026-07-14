"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCommunicationAction } from "@/app/requests/[id]/actions";

const CHANNELS = ["PHONE", "EMAIL", "TEXT", "IN_PERSON", "OTHER"] as const;

export function CommunicationForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [channel, setChannel] = useState<string>("PHONE");
  const [direction, setDirection] = useState<string>("OUTBOUND");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await logCommunicationAction(requestId, { channel, direction, summary });
      if (res.ok) {
        setSummary("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not log communication");
      }
    });
  }

  const input = "h-9 rounded-md border border-slate-300 px-2 text-sm";

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Log communication</h3>
      <div className="mt-2 flex gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          data-testid="comm-direction"
          className={input}
          aria-label="Direction"
        >
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          data-testid="comm-channel"
          className={input}
          aria-label="Channel"
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ").toLowerCase()}</option>
          ))}
        </select>
      </div>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        data-testid="comm-summary"
        placeholder="What was discussed?"
        className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={pending || summary.trim().length === 0}
          onClick={submit}
          data-testid="comm-submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Log"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
