"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ImageOff } from "lucide-react";
import { StatusPill } from "./StatusPill";
import type { PortalRequestRow } from "@/lib/services/portalData";

type Segment = "active" | "completed";

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Row({ row }: { row: PortalRequestRow }) {
  return (
    <Link
      href={`/app/projects/${row.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-slate-100"
      data-testid="request-row"
    >
      <div className="h-14 w-14 flex-none overflow-hidden rounded-xl bg-slate-100">
        {row.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageOff className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-ink">{row.title}</p>
        <p className="truncate text-xs text-slate-400">
          {row.requestNumber} · Updated {formatDate(row.updatedAt)}
        </p>
        <div className="mt-1">
          <StatusPill status={row.customerStatus} />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 flex-none text-slate-300" aria-hidden />
    </Link>
  );
}

export function ProjectsList({
  active,
  completed,
}: {
  active: PortalRequestRow[];
  completed: PortalRequestRow[];
}) {
  const [segment, setSegment] = useState<Segment>("active");
  const rows = segment === "active" ? active : completed;

  return (
    <div className="px-5">
      {/* iOS-style segmented control */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
        {(["active", "completed"] as const).map((seg) => (
          <button
            key={seg}
            type="button"
            role="tab"
            aria-selected={segment === seg}
            onClick={() => setSegment(seg)}
            className={`rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
              segment === seg ? "bg-white text-brand-ink shadow-sm" : "text-slate-500"
            }`}
            data-testid={`segment-${seg}`}
          >
            {seg} ({seg === "active" ? active.length : completed.length})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {segment === "active"
            ? "No active work right now."
            : "Nothing completed yet."}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
