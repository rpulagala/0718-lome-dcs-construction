import Link from "next/link";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { requirePortalUser } from "@/lib/portal/session";
import { listPortalThreads } from "@/lib/services/messaging";
import { LargeTitle } from "@/components/portal/LargeTitle";

function preview(sender: "CUSTOMER" | "STAFF" | null, body: string | null): string {
  if (!body) return "No messages yet";
  return `${sender === "CUSTOMER" ? "You: " : ""}${body}`;
}

function timeLabel(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function PortalMessages() {
  const session = await requirePortalUser();
  const threads = await listPortalThreads(session.sub);

  return (
    <div className="pb-10">
      <LargeTitle title="Messages" subtitle="Chat with the DCS team" />

      {threads.length === 0 ? (
        <div className="px-5">
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            You don&apos;t have any requests to message about yet.
          </div>
        </div>
      ) : (
        <div className="mx-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {threads.map((t) => (
            <Link
              key={t.requestId}
              href={`/app/messages/${t.requestId}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100 dark:active:bg-slate-800"
              data-testid="thread-row"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/25 dark:text-blue-300">
                <MessagesSquare className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-brand-ink dark:text-slate-100">{t.title}</p>
                  {t.lastAt && <span className="flex-none text-[11px] text-slate-400 dark:text-slate-500">{timeLabel(t.lastAt)}</span>}
                </div>
                <p
                  className={`truncate text-xs ${t.unread > 0 ? "font-semibold text-brand-ink dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}
                >
                  {preview(t.lastSender, t.lastBody)}
                </p>
              </div>
              {t.unread > 0 ? (
                <span
                  className="flex-none rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-bold text-white"
                  data-testid="thread-unread"
                >
                  {t.unread}
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 flex-none text-slate-300 dark:text-slate-600" aria-hidden />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
