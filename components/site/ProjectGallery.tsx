"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface GalleryItem {
  title: string;
  category: string;
  description: string;
  hue: number;
}

function Tile({ item }: { item: GalleryItem }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-end p-3 text-left"
      style={{
        background: `linear-gradient(135deg, hsl(${item.hue} 45% 42%), hsl(${item.hue + 25} 50% 30%))`,
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-white/70">
        {item.category}
      </span>
      <span className="text-sm font-semibold text-white">{item.title}</span>
    </div>
  );
}

export function ProjectGallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % items.length)),
    [items.length],
  );
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  const active = open === null ? null : items[open];

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="aspect-[4/3] w-full overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              data-testid="gallery-item"
              aria-label={`View ${item.title} (${item.category})`}
            >
              <Tile item={item} />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title}, ${active.category}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
          data-testid="lightbox"
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex aspect-[4/3] w-full flex-col justify-end rounded-lg p-6"
              style={{
                background: `linear-gradient(135deg, hsl(${active.hue} 45% 42%), hsl(${active.hue + 25} 50% 30%))`,
              }}
            >
              <span className="text-sm font-medium uppercase tracking-wide text-white/70">
                {active.category}
              </span>
              <h3 className="text-2xl font-bold text-white">{active.title}</h3>
              <p className="mt-1 max-w-prose text-white/85">{active.description}</p>
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              data-testid="lightbox-close"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-slate-900 shadow"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-900 hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-900 hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
