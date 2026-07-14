"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import type { PhotoMeta } from "@/lib/validation/workRequest";

interface Item {
  id: string;
  previewUrl: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  meta?: PhotoMeta;
}

interface Props {
  max: number;
  maxMb: number;
  onChange: (photos: PhotoMeta[]) => void;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function uploadFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<PhotoMeta> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as PhotoMeta);
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export function PhotoUploader({ max, maxMb, onChange }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (list: Item[]) => {
      onChange(
        list
          .filter((i) => i.status === "done" && i.meta)
          .map((i) => i.meta as PhotoMeta),
      );
    },
    [onChange],
  );

  const update = useCallback(
    (id: string, patch: Partial<Item>) => {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
        emit(next);
        return next;
      });
    },
    [emit],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const room = max - items.length;
      const toAdd = incoming.slice(0, Math.max(0, room));

      for (const file of toAdd) {
        const id = crypto.randomUUID();
        if (!ALLOWED.includes(file.type)) {
          setItems((prev) => {
            const next = [
              ...prev,
              {
                id,
                previewUrl: "",
                progress: 0,
                status: "error" as const,
                error: "Unsupported file type",
              },
            ];
            return next;
          });
          continue;
        }
        if (file.size > maxMb * 1024 * 1024) {
          setItems((prev) => [
            ...prev,
            {
              id,
              previewUrl: "",
              progress: 0,
              status: "error" as const,
              error: `Larger than ${maxMb} MB`,
            },
          ]);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        setItems((prev) => [
          ...prev,
          { id, previewUrl, progress: 0, status: "uploading" },
        ]);

        try {
          const dims = await readDimensions(file);
          const meta = await uploadFile(file, (pct) => update(id, { progress: pct }));
          update(id, {
            status: "done",
            progress: 100,
            meta: { ...meta, width: dims.width, height: dims.height },
          });
        } catch (err) {
          update(id, { status: "error", error: (err as Error).message });
        }
      }
    },
    [items.length, max, maxMb, update],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        emit(next);
        return next;
      });
    },
    [emit],
  );

  const atLimit = items.length >= max;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver ? "border-slate-500 bg-slate-50" : "border-slate-300"
        } ${atLimit ? "opacity-50" : ""}`}
      >
        <Upload className="mb-2 h-6 w-6 text-slate-400" aria-hidden />
        <p className="text-sm text-slate-600">
          Drag &amp; drop photos here, or{" "}
          <button
            type="button"
            className="font-medium text-slate-900 underline disabled:no-underline"
            onClick={() => inputRef.current?.click()}
            disabled={atLimit}
            data-testid="photo-browse"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          JPG, PNG, or WEBP · up to {maxMb} MB each · max {max} photos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          data-testid="photo-input"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul
          className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4"
          data-testid="photo-list"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt="Selected project photo preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2 text-center">
                  <AlertCircle className="h-5 w-5 text-red-500" aria-hidden />
                </div>
              )}

              {item.status === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  <span className="mt-1 text-xs">{item.progress}%</span>
                </div>
              )}

              {item.status === "error" && (
                <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-1 py-0.5 text-center text-[10px] text-white">
                  {item.error}
                </div>
              )}

              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Remove photo"
                data-testid="photo-remove"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
