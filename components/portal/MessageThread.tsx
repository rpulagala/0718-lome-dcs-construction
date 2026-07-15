"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ImagePlus, Send } from "lucide-react";
import { PhotoUploader } from "@/components/request/PhotoUploader";
import { sendPortalMessageAction } from "@/app/app/messages/[requestId]/actions";
import type { ThreadMessage } from "@/lib/services/messaging";
import type { PhotoMeta } from "@/lib/validation/workRequest";

const POLL_MS = 8000;

function timeLabel(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageThread({
  requestId,
  title,
  requestNumber,
  messages,
  maxPhotos,
  maxMb,
}: {
  requestId: string;
  title: string;
  requestNumber: string;
  messages: ThreadMessage[];
  maxPhotos: number;
  maxMb: number;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PhotoMeta[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploaderKey, setUploaderKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll for staff replies while the thread is open.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const lastOwnRead =
    [...messages].reverse().find((m) => m.senderType === "CUSTOMER")?.readAt != null;

  function submit() {
    setError(null);
    const payload = { body: body.trim(), attachments };
    if (!payload.body && payload.attachments.length === 0) {
      setError("Type a message or add a photo.");
      return;
    }
    startTransition(async () => {
      const res = await sendPortalMessageAction(requestId, payload);
      if (res.ok) {
        setBody("");
        setAttachments([]);
        setShowUploader(false);
        setUploaderKey((k) => k + 1); // reset the uploader
        router.refresh();
      } else {
        setError(res.error ?? "Could not send your message.");
      }
    });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 pt-6 pb-3 backdrop-blur">
        <Link href="/app/messages" className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Messages
        </Link>
        <h1 className="mt-1 truncate text-lg font-bold text-brand-ink">{title}</h1>
        <p className="text-xs text-slate-400">{requestNumber}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 px-4 py-4" data-testid="message-list">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-400">
            No messages yet. Send the DCS team a note about this job.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderType === "CUSTOMER";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? "rounded-br-md bg-brand-navy text-white"
                      : "rounded-bl-md bg-white text-brand-ink shadow-sm ring-1 ring-slate-200"
                  }`}
                  data-testid="message-bubble"
                >
                  {!mine && <p className="mb-0.5 text-[11px] font-semibold text-brand-navy">{m.authorName}</p>}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.attachments.length > 0 && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {m.attachments.map((a) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={a.id}
                          src={a.src}
                          alt={a.fileName}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className={`mt-0.5 px-1 text-[10px] text-slate-400 ${mine ? "text-right" : ""}`}>
                  {timeLabel(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {lastOwnRead && <p className="pr-1 text-right text-[10px] text-slate-400">Read</p>}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {showUploader && (
          <div className="mb-2" key={uploaderKey}>
            <PhotoUploader max={maxPhotos} maxMb={maxMb} onChange={setAttachments} />
          </div>
        )}
        {error && (
          <p className="mb-1 text-xs text-red-600" role="alert" data-testid="message-error">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowUploader((s) => !s)}
            aria-label="Add photo"
            className={`flex-none rounded-full p-2 ${showUploader ? "bg-brand-navy text-white" : "text-brand-navy"}`}
            data-testid="message-attach"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={1}
            placeholder="Message the DCS team…"
            data-testid="message-input"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-brand-navy"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            aria-label="Send"
            className="flex-none rounded-full bg-brand-navy p-2.5 text-white disabled:opacity-50"
            data-testid="message-send"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
