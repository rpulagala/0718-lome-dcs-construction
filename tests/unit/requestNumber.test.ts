import { describe, it, expect } from "vitest";
import {
  formatRequestNumber,
  parseRequestNumber,
  formatEstimateNumber,
} from "@/lib/domain/requestNumber";

describe("formatRequestNumber", () => {
  it("zero-pads the sequence to 6 digits", () => {
    expect(formatRequestNumber(2026, 123)).toBe("DCS-2026-000123");
  });

  it("handles the first request of a year", () => {
    expect(formatRequestNumber(2026, 1)).toBe("DCS-2026-000001");
  });

  it("does not truncate sequences beyond 6 digits", () => {
    expect(formatRequestNumber(2026, 1234567)).toBe("DCS-2026-1234567");
  });

  it("rejects invalid years and sequences", () => {
    expect(() => formatRequestNumber(1999, 1)).toThrow();
    expect(() => formatRequestNumber(2026, 0)).toThrow();
    expect(() => formatRequestNumber(2026, -5)).toThrow();
  });
});

describe("parseRequestNumber", () => {
  it("round-trips a formatted number", () => {
    expect(parseRequestNumber("DCS-2026-000123")).toEqual({
      year: 2026,
      seq: 123,
    });
  });

  it("returns null for malformed input", () => {
    expect(parseRequestNumber("XYZ-2026-1")).toBeNull();
    expect(parseRequestNumber("DCS-26-000001")).toBeNull();
  });
});

describe("formatEstimateNumber", () => {
  it("uses the EST prefix", () => {
    expect(formatEstimateNumber(2026, 7)).toBe("EST-2026-000007");
  });
});
