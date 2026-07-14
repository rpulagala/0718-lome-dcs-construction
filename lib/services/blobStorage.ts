import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { env } from "@/lib/env";

/**
 * Object-storage abstraction. Returns an opaque *locator* stored as
 * WorkRequestPhoto.storageKey. Local mode writes under .storage/; Vercel mode
 * uses Vercel Blob and stores the blob URL as the locator. All reads go through
 * the auth-guarded /api/files route (see docs/SECURITY.md).
 */
const LOCAL_DIR = path.join(process.cwd(), ".storage");

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Randomized, non-guessable storage key. */
export function randomKey(prefix: string, contentType: string): string {
  const ext = EXT[contentType] ?? "";
  const year = new Date().getFullYear();
  return `${prefix}/${year}/${crypto.randomUUID()}${ext}`;
}

export function isRemoteLocator(locator: string): boolean {
  return /^https?:\/\//i.test(locator);
}

/** Store bytes; returns the locator to persist. */
export async function putObject(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (env.BLOB_MODE === "vercel") {
    const res = await put(key, data, {
      access: "public",
      contentType,
      token: env.BLOB_READ_WRITE_TOKEN || undefined,
      addRandomSuffix: false,
    });
    return res.url;
  }
  const full = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return key;
}

/** Read bytes for streaming through the guarded route. */
export async function readObject(
  locator: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    if (isRemoteLocator(locator)) {
      const res = await fetch(locator);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        data: buf,
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
      };
    }
    const full = path.join(LOCAL_DIR, locator);
    // Prevent path traversal outside the storage dir.
    if (!full.startsWith(LOCAL_DIR)) return null;
    const data = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    return { data, contentType };
  } catch {
    return null;
  }
}
