import { describe, it, expect } from "vitest";
import {
  userInviteSchema,
  categoryCreateSchema,
  uploadLimitsSchema,
  intakeRecipientsSchema,
  workflowDefaultsSchema,
  companyProfileSchema,
} from "@/lib/validation/admin";

describe("userInviteSchema", () => {
  it("accepts a valid invite and lowercases the email", () => {
    const res = userInviteSchema.safeParse({
      name: "Jane Doe",
      email: "Jane.Doe@Example.COM",
      role: "MANAGER",
      phone: "",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe("jane.doe@example.com");
  });

  it("rejects a bad email and an unknown role", () => {
    expect(userInviteSchema.safeParse({ name: "X", email: "nope", role: "MANAGER" }).success).toBe(false);
    expect(userInviteSchema.safeParse({ name: "X", email: "a@b.com", role: "ROOT" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(userInviteSchema.safeParse({ name: "  ", email: "a@b.com", role: "EMPLOYEE" }).success).toBe(false);
  });
});

describe("categoryCreateSchema", () => {
  it("trims the name and allows empty description", () => {
    const res = categoryCreateSchema.safeParse({ name: "  Roofing  ", description: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe("Roofing");
  });

  it("rejects an empty name", () => {
    expect(categoryCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("uploadLimitsSchema", () => {
  it("coerces numeric strings and enforces bounds", () => {
    const res = uploadLimitsSchema.safeParse({ maxFiles: "5", maxMb: "8" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual({ maxFiles: 5, maxMb: 8 });
    expect(uploadLimitsSchema.safeParse({ maxFiles: 0, maxMb: 10 }).success).toBe(false);
    expect(uploadLimitsSchema.safeParse({ maxFiles: 5, maxMb: 999 }).success).toBe(false);
  });
});

describe("intakeRecipientsSchema", () => {
  it("accepts a list of valid emails", () => {
    expect(intakeRecipientsSchema.safeParse({ emails: ["a@b.com", "c@d.com"] }).success).toBe(true);
  });
  it("accepts an empty list but rejects an invalid address", () => {
    expect(intakeRecipientsSchema.safeParse({ emails: [] }).success).toBe(true);
    expect(intakeRecipientsSchema.safeParse({ emails: ["bad"] }).success).toBe(false);
  });
});

describe("workflowDefaultsSchema", () => {
  it("defaults the boolean flags and coerces hours", () => {
    const res = workflowDefaultsSchema.safeParse({
      defaultStatus: "NEW",
      defaultPriority: "NORMAL",
      responseTargetHours: "48",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.responseTargetHours).toBe(48);
      expect(res.data.autoAssign).toBe(false);
      expect(res.data.notifyOnNewRequest).toBe(true);
    }
  });

  it("rejects a status that is not an allowed default", () => {
    expect(
      workflowDefaultsSchema.safeParse({
        defaultStatus: "COMPLETED",
        defaultPriority: "NORMAL",
        responseTargetHours: 48,
      }).success,
    ).toBe(false);
  });
});

describe("companyProfileSchema", () => {
  it("allows a blank email but rejects a malformed one", () => {
    expect(companyProfileSchema.safeParse({ name: "DCS", email: "" }).success).toBe(true);
    expect(companyProfileSchema.safeParse({ name: "DCS", email: "not-email" }).success).toBe(false);
  });
});
