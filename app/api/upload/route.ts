import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { validateImage, sanitizeFileName } from "@/lib/services/fileValidation";
import { putObject, randomKey } from "@/lib/services/blobStorage";
import { rateLimit } from "@/lib/services/rateLimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** Public photo upload for the intake form. Validates by magic bytes + size. */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`upload:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429 },
    );
  }

  let file: FormDataEntryValue | null;
  try {
    const form = await req.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = validateImage(bytes, maxBytes);
  if (!result.ok || !result.type) {
    return NextResponse.json(
      { error: result.error ?? "Invalid file" },
      { status: 400 },
    );
  }

  const key = randomKey("uploads", result.type);
  try {
    await putObject(key, Buffer.from(bytes), result.type);
  } catch (err) {
    logger.error("upload.store_failed", { error: String(err) });
    return NextResponse.json({ error: "Could not store file" }, { status: 500 });
  }

  logger.info("upload.stored", { key, size: bytes.length, type: result.type });
  return NextResponse.json({
    storageKey: key,
    fileName: sanitizeFileName(file.name),
    contentType: result.type,
    sizeBytes: bytes.length,
  });
}
