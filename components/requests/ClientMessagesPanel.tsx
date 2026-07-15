"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendClientMessageAction,
  markClientMessagesReadAction,
} from "@/app/requests/[id]/actions";
import type { ThreadMessage } from "@/lib/services/messaging";

function timeLabel(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Staff view of the customer message thread. Reading the request marks the
 * customer's messages as read; staff can reply (text). Mirrors the customer's
 * in-app conversation — one source of truth.
 */
export function ClientMessagesPanel({
  requestId,
  messages,
  unread,
}: {
  requestId: string;
  messages: ThreadMessage[];
  unread: number;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const marked = useRef(false);

  // Viewing the request marks inbound customer messages as read (once).
  useEffect(() => {
    if (unread > 0 && !marked.current) {
      marked.current = true;
      markClientMessagesReadAction(requestId).then(() => router.refresh());
    }
  }, [unread, requestId, router]);

  function submit() {
    setError(null);
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await sendClientMessageAction(requestId, text);
      if (res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not send message");
      }
    });
  }

  return (
    <div data-testid="client-messages-panel">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Customer messages</h3>
        {unread > 0 && (
          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unread} new
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-slate-400">No messages with this customer yet.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const staff = m.senderType === "STAFF";
            return (
              <li key={m.id} className={`flex ${staff ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      staff
                        ? "rounded-br-md bg-slate-900 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className={`mb-0.5 text-[11px] font-semibold ${staff ? "text-slate-300" : "text-slate-500"}`}>
                      {m.authorName}
                    </p>
                    {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                    {m.attachments.length > 0 && (
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {m.attachments.map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={a.id}
                            src={a.src}
                            alt={a.fileName}
                            className="aspect-square w-full rounded-md object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={`mt-0.5 px-1 text-[10px] text-slate-400 ${staff ? "text-right" : ""}`}>
                    {timeLabel(m.createdAt)}
                    {staff && (m.readAt ? " · Read" : " · Sent")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Reply to the customer…"
          data-testid="staff-message-input"
          className="w-full rounded-md border border-slate-300 p-2 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={pending || body.trim().length === 0}
            data-testid="staff-message-send"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
