import { describe, it, expect } from "vitest";
import {
  sniffImageType,
  sanitizeFileName,
  validateImage,
} from "@/lib/services/fileValidation";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // "MZ" DOS header

describe("sniffImageType", () => {
  it("detects real image types by magic bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("rejects non-image content (e.g. an executable)", () => {
    expect(sniffImageType(EXE)).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("strips path components", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\x\\photo.jpg")).toBe("photo.jpg");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeFileName("my photo!.jpg")).toBe("my_photo_.jpg");
  });
});

describe("validateImage", () => {
  it("accepts a valid image within the size limit", () => {
    expect(validateImage(JPEG, 1000)).toEqual({ ok: true, type: "image/jpeg" });
  });

  it("rejects files over the size limit", () => {
    const res = validateImage(JPEG, 3);
    expect(res.ok).toBe(false);
  });

  it("rejects disguised executables", () => {
    const res = validateImage(EXE, 1000);
    expect(res.ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateImage(new Uint8Array([]), 1000).ok).toBe(false);
  });
});
