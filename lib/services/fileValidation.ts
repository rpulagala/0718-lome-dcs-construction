/**
 * Upload validation: verify image type by magic bytes (not just the declared
 * MIME/extension), enforce size, and sanitize filenames. See docs/SECURITY.md.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Sniff the real image type from the leading bytes; null if unrecognized. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Strip paths and unsafe characters from a client-provided filename. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return cleaned || "file";
}

export interface FileValidationResult {
  ok: boolean;
  type?: AllowedImageType;
  error?: string;
}

/** Validate an uploaded image buffer against type and size limits. */
export function validateImage(
  bytes: Uint8Array,
  maxBytes: number,
): FileValidationResult {
  if (bytes.length === 0) return { ok: false, error: "Empty file" };
  if (bytes.length > maxBytes) {
    return { ok: false, error: "File exceeds the size limit" };
  }
  const type = sniffImageType(bytes);
  if (!type) {
    return { ok: false, error: "Unsupported or non-image file" };
  }
  return { ok: true, type };
}
