import { UserRole } from "@/lib/generated/prisma/enums";

/** Role hierarchy — higher number grants everything below it. */
const RANK: Record<UserRole, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  PRINCIPAL_ADMIN: 3,
};

/** True if `role` is at least `required` in the hierarchy. */
export function hasRole(
  role: UserRole | undefined | null,
  required: UserRole,
): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[required];
}

export const isEmployee = (r: UserRole | undefined | null) =>
  hasRole(r, "EMPLOYEE");
export const isManager = (r: UserRole | undefined | null) =>
  hasRole(r, "MANAGER");
export const isAdmin = (r: UserRole | undefined | null) =>
  hasRole(r, "PRINCIPAL_ADMIN");

/** Actions gated by role. Extend as features land. */
export type Action =
  | "request:view"
  | "request:note"
  | "request:status"
  | "request:schedule"
  | "request:assign"
  | "request:archive"
  | "estimate:manage"
  | "reports:view"
  | "admin:users"
  | "admin:categories"
  | "admin:settings"
  | "admin:audit"
  | "data:export";

const MIN_ROLE: Record<Action, UserRole> = {
  "request:view": "EMPLOYEE",
  "request:note": "EMPLOYEE",
  "request:status": "EMPLOYEE",
  "request:schedule": "EMPLOYEE",
  "request:assign": "MANAGER",
  "request:archive": "MANAGER",
  "estimate:manage": "MANAGER",
  "reports:view": "MANAGER",
  "admin:users": "PRINCIPAL_ADMIN",
  "admin:categories": "PRINCIPAL_ADMIN",
  "admin:settings": "PRINCIPAL_ADMIN",
  "admin:audit": "PRINCIPAL_ADMIN",
  "data:export": "PRINCIPAL_ADMIN",
};

/** Server-side authorization check. UI hiding is never sufficient. */
export function can(
  role: UserRole | undefined | null,
  action: Action,
): boolean {
  return hasRole(role, MIN_ROLE[action]);
}
