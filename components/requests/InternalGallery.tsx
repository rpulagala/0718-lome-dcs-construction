"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  id: string;
  storageKey: string;
  fileName: string;
}

export function InternalGallery({ photos }: { photos: Photo[] }) {
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

  if (photos.length === 0) {
    return <p className="text-sm text-slate-400">No photos attached.</p>;
  }

  const active = open === null ? null : photos[open];

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="internal-gallery">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="aspect-square w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-slate-400"
              aria-label={`Enlarge ${p.fileName}`}
              data-testid="gallery-thumb"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${p.storageKey}`}
                alt={p.fileName}
                className="h-full w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.fileName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
          data-testid="internal-lightbox"
        >
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${active.storageKey}`}
              alt={active.fileName}
              className="max-h-[80vh] rounded-lg bg-white object-contain"
            />
            <button type="button" onClick={close} aria-label="Close" className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 shadow">
              <X className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={prev} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={next} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 hover:bg-white">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
