import { describe, it, expect } from "vitest";
import { hasRole, can, isAdmin, isManager } from "@/lib/auth/roles";

describe("hasRole hierarchy", () => {
  it("grants lower privileges to higher roles", () => {
    expect(hasRole("PRINCIPAL_ADMIN", "EMPLOYEE")).toBe(true);
    expect(hasRole("MANAGER", "EMPLOYEE")).toBe(true);
    expect(hasRole("EMPLOYEE", "EMPLOYEE")).toBe(true);
  });

  it("denies higher privileges to lower roles", () => {
    expect(hasRole("EMPLOYEE", "MANAGER")).toBe(false);
    expect(hasRole("MANAGER", "PRINCIPAL_ADMIN")).toBe(false);
  });

  it("denies when role is absent", () => {
    expect(hasRole(null, "EMPLOYEE")).toBe(false);
    expect(hasRole(undefined, "EMPLOYEE")).toBe(false);
  });
});

describe("can(action)", () => {
  it("lets employees view and note requests", () => {
    expect(can("EMPLOYEE", "request:view")).toBe(true);
    expect(can("EMPLOYEE", "request:note")).toBe(true);
  });

  it("blocks employees from manager and admin actions", () => {
    expect(can("EMPLOYEE", "request:assign")).toBe(false);
    expect(can("EMPLOYEE", "admin:users")).toBe(false);
  });

  it("lets managers assign but not manage users", () => {
    expect(can("MANAGER", "request:assign")).toBe(true);
    expect(can("MANAGER", "admin:users")).toBe(false);
  });

  it("lets principal admins do everything", () => {
    expect(can("PRINCIPAL_ADMIN", "admin:users")).toBe(true);
    expect(can("PRINCIPAL_ADMIN", "data:export")).toBe(true);
  });
});

describe("role guards", () => {
  it("isAdmin / isManager reflect hierarchy", () => {
    expect(isAdmin("PRINCIPAL_ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
    expect(isManager("MANAGER")).toBe(true);
    expect(isManager("EMPLOYEE")).toBe(false);
  });
});
