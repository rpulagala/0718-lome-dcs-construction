import { describe, it, expect } from "vitest";
import { toCustomerStatus, internalStatusLabel } from "@/lib/domain/status";

describe("toCustomerStatus", () => {
  it("maps internal statuses to customer-friendly labels", () => {
    expect(toCustomerStatus("NEW")).toBe("Request Received");
    expect(toCustomerStatus("SITE_VISIT_SCHEDULED")).toBe("Site Visit Scheduled");
    expect(toCustomerStatus("ESTIMATE_IN_PROGRESS")).toBe("Estimate Being Prepared");
    expect(toCustomerStatus("COMPLETED")).toBe("Completed");
  });

  it("collapses terminal internal states to Closed", () => {
    expect(toCustomerStatus("DECLINED")).toBe("Closed");
    expect(toCustomerStatus("CANCELLED")).toBe("Closed");
    expect(toCustomerStatus("ARCHIVED")).toBe("Closed");
  });

  it("never exposes raw internal status names to customers", () => {
    // Customer labels are a fixed friendly vocabulary, not the enum values.
    expect(toCustomerStatus("ESTIMATE_IN_PROGRESS")).not.toContain("_");
  });
});

describe("internalStatusLabel", () => {
  it("humanizes enum names", () => {
    expect(internalStatusLabel("NEEDS_MORE_INFORMATION")).toBe(
      "Needs More Information",
    );
    expect(internalStatusLabel("NEW")).toBe("New");
  });
});
