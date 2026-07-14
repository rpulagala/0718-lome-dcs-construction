import { describe, it, expect } from "vitest";
import { addBusinessHours, isOverdue } from "@/lib/domain/businessHours";

describe("addBusinessHours", () => {
  it("adds hours within the same business day", () => {
    // Wed 2026-07-15 09:00 + 5h = 14:00 same day
    const start = new Date("2026-07-15T09:00:00");
    const due = addBusinessHours(start, 5);
    expect(due.getHours()).toBe(14);
    expect(due.getDate()).toBe(15);
  });

  it("skips weekend hours", () => {
    // Fri 2026-07-17 20:00 + 6h should roll past Sat/Sun into Monday
    const start = new Date("2026-07-17T20:00:00");
    const due = addBusinessHours(start, 6);
    expect(due.getDay()).toBe(1); // Monday
  });

  it("never lands on a weekend", () => {
    const start = new Date("2026-07-17T09:00:00"); // Friday
    const due = addBusinessHours(start, 48);
    expect(due.getDay()).not.toBe(0);
    expect(due.getDay()).not.toBe(6);
  });
});

describe("isOverdue", () => {
  const due = new Date("2026-07-15T12:00:00");

  it("is overdue when past due and never contacted", () => {
    expect(isOverdue(due, null, new Date("2026-07-15T13:00:00"))).toBe(true);
  });

  it("is not overdue before the due time", () => {
    expect(isOverdue(due, null, new Date("2026-07-15T11:00:00"))).toBe(false);
  });

  it("is never overdue once contacted", () => {
    expect(
      isOverdue(due, new Date("2026-07-15T10:00:00"), new Date("2026-07-16T10:00:00")),
    ).toBe(false);
  });
});
