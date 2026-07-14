import { describe, it, expect } from "vitest";
import {
  visitWindow,
  rangesOverlap,
  combineDateTime,
  isActiveAppointment,
  DEFAULT_VISIT_MINUTES,
} from "@/lib/domain/scheduling";

describe("combineDateTime", () => {
  it("combines a date and time into a local Date", () => {
    const d = combineDateTime("2026-08-15", "14:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(7); // August (0-indexed)
    expect(d!.getDate()).toBe(15);
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it("defaults to midnight when no time is given", () => {
    const d = combineDateTime("2026-08-15", null);
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
  });

  it("rejects malformed dates and times", () => {
    expect(combineDateTime("2026/08/15", "14:30")).toBeNull();
    expect(combineDateTime("2026-08-15", "25:00")).toBeNull();
    expect(combineDateTime("2026-08-15", "12:99")).toBeNull();
    expect(combineDateTime("not-a-date")).toBeNull();
  });
});

describe("visitWindow", () => {
  it("uses the explicit end time when after start", () => {
    const start = new Date("2026-08-15T10:00:00");
    const end = new Date("2026-08-15T12:00:00");
    const w = visitWindow(start, end);
    expect(w.end.getTime()).toBe(end.getTime());
  });

  it("applies the default duration when no end time is given", () => {
    const start = new Date("2026-08-15T10:00:00");
    const w = visitWindow(start, null);
    expect(w.end.getTime() - w.start.getTime()).toBe(DEFAULT_VISIT_MINUTES * 60_000);
  });

  it("ignores an end time that is not after the start", () => {
    const start = new Date("2026-08-15T10:00:00");
    const end = new Date("2026-08-15T09:00:00");
    const w = visitWindow(start, end);
    expect(w.end.getTime()).toBeGreaterThan(w.start.getTime());
  });
});

describe("rangesOverlap", () => {
  const win = (s: string, e: string) => ({ start: new Date(s), end: new Date(e) });

  it("detects overlapping windows", () => {
    expect(
      rangesOverlap(
        win("2026-08-15T10:00:00", "2026-08-15T11:00:00"),
        win("2026-08-15T10:30:00", "2026-08-15T11:30:00"),
      ),
    ).toBe(true);
  });

  it("treats adjacent (touching) windows as non-overlapping", () => {
    expect(
      rangesOverlap(
        win("2026-08-15T10:00:00", "2026-08-15T11:00:00"),
        win("2026-08-15T11:00:00", "2026-08-15T12:00:00"),
      ),
    ).toBe(false);
  });

  it("detects fully-separate windows as non-overlapping", () => {
    expect(
      rangesOverlap(
        win("2026-08-15T10:00:00", "2026-08-15T11:00:00"),
        win("2026-08-15T13:00:00", "2026-08-15T14:00:00"),
      ),
    ).toBe(false);
  });
});

describe("isActiveAppointment", () => {
  it("counts proposed/confirmed/rescheduled as active", () => {
    expect(isActiveAppointment("PROPOSED")).toBe(true);
    expect(isActiveAppointment("CONFIRMED")).toBe(true);
    expect(isActiveAppointment("RESCHEDULED")).toBe(true);
  });

  it("does not count completed/cancelled/no-show as active", () => {
    expect(isActiveAppointment("COMPLETED")).toBe(false);
    expect(isActiveAppointment("CANCELLED")).toBe(false);
    expect(isActiveAppointment("NO_SHOW")).toBe(false);
  });
});
