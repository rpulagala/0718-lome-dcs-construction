"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PortalPhoto } from "@/lib/services/portalData";

/** Full-screen, swipe-style photo viewer for a request's photos. */
export function PortalGallery({ photos }: { photos: PortalPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(
    () => setOpen((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length],
  );
  const prev = useCallback(
    () => setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length],
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

  if (photos.length === 0) return null;

  const active = open === null ? null : photos[open];

  return (
    <>
      <ul className="grid grid-cols-3 gap-2" data-testid="portal-gallery">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 active:opacity-80"
              aria-label={`View ${p.fileName}`}
              data-testid="gallery-thumb"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.fileName} className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.fileName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          data-testid="portal-lightbox"
        >
          <div className="relative max-h-full w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.src} alt={active.fileName} className="max-h-[80vh] w-full rounded-2xl object-contain" />
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 shadow"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
