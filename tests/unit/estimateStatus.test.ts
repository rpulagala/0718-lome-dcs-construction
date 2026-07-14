import { describe, it, expect } from "vitest";
import {
  canTransitionEstimate,
  allowedEstimateTransitions,
  isEstimateEditable,
  estimateStatusLabel,
} from "@/lib/domain/estimateStatus";

describe("estimate status machine", () => {
  it("allows the happy path DRAFT → SENT → ACCEPTED", () => {
    expect(canTransitionEstimate("DRAFT", "SENT")).toBe(true);
    expect(canTransitionEstimate("SENT", "ACCEPTED")).toBe(true);
  });

  it("treats ACCEPTED and REVISED as terminal", () => {
    expect(allowedEstimateTransitions("ACCEPTED")).toEqual([]);
    expect(allowedEstimateTransitions("REVISED")).toEqual([]);
  });

  it("rejects skipping straight from DRAFT to ACCEPTED", () => {
    expect(canTransitionEstimate("DRAFT", "ACCEPTED")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(canTransitionEstimate("SENT", "SENT")).toBe(false);
  });

  it("permits revision from sent, declined, or expired", () => {
    expect(canTransitionEstimate("SENT", "REVISED")).toBe(true);
    expect(canTransitionEstimate("DECLINED", "REVISED")).toBe(true);
    expect(canTransitionEstimate("EXPIRED", "REVISED")).toBe(true);
  });

  it("only allows editing draft/under-review estimates", () => {
    expect(isEstimateEditable("DRAFT")).toBe(true);
    expect(isEstimateEditable("UNDER_REVIEW")).toBe(true);
    expect(isEstimateEditable("SENT")).toBe(false);
    expect(isEstimateEditable("ACCEPTED")).toBe(false);
  });

  it("humanizes status labels", () => {
    expect(estimateStatusLabel("UNDER_REVIEW")).toBe("Under Review");
    expect(estimateStatusLabel("SENT")).toBe("Sent");
  });
});
