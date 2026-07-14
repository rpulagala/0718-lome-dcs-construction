"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNoteAction } from "@/app/requests/[id]/actions";

export function NoteForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("INTERNAL");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addNoteAction(requestId, body, visibility);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not add note");
      }
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Add a note</h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        data-testid="note-body"
        placeholder="Write a note…"
        className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
      />
      <div className="mt-2 flex items-center justify-between">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          data-testid="note-visibility"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="INTERNAL">Internal only</option>
          <option value="CUSTOMER_VISIBLE">Customer-visible</option>
        </select>
        <button
          type="button"
          disabled={pending || body.trim().length === 0}
          onClick={submit}
          data-testid="note-submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
