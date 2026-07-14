import { describe, it, expect } from "vitest";
import {
  canTransition,
  allowedTransitions,
  notifiesCustomer,
} from "@/lib/domain/statusMachine";

describe("canTransition", () => {
  it("allows a valid forward transition", () => {
    expect(canTransition("NEW", "REVIEWING")).toBe(true);
    expect(canTransition("ESTIMATE_SENT", "APPROVED")).toBe(true);
  });

  it("rejects an invalid transition", () => {
    expect(canTransition("NEW", "COMPLETED")).toBe(false);
    expect(canTransition("ARCHIVED", "NEW")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransition("NEW", "NEW")).toBe(false);
  });

  it("allows terminal states to move to ARCHIVED", () => {
    expect(canTransition("COMPLETED", "ARCHIVED")).toBe(true);
    expect(canTransition("CANCELLED", "ARCHIVED")).toBe(true);
  });
});

describe("allowedTransitions", () => {
  it("returns an empty list for ARCHIVED (terminal)", () => {
    expect(allowedTransitions("ARCHIVED")).toEqual([]);
  });
});

describe("notifiesCustomer", () => {
  it("notifies on meaningful customer-facing changes", () => {
    expect(notifiesCustomer("SITE_VISIT_SCHEDULED")).toBe(true);
    expect(notifiesCustomer("ESTIMATE_SENT")).toBe(true);
    expect(notifiesCustomer("COMPLETED")).toBe(true);
  });

  it("does not notify on internal-only changes", () => {
    expect(notifiesCustomer("REVIEWING")).toBe(false);
    expect(notifiesCustomer("ESTIMATE_IN_PROGRESS")).toBe(false);
  });
});
