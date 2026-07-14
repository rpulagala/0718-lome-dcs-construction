import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { hashPassword } from "@/lib/auth/password";
import { logger } from "@/lib/logger";
import { recordAudit } from "./audit";
import { sendEmail } from "./mailService";
import { renderUserInvite } from "./emailTemplates";
import {
  userInviteSchema,
  userEditSchema,
  type UserInviteInput,
  type UserEditInput,
} from "@/lib/validation/admin";

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  PRINCIPAL_ADMIN: "Principal Administrator",
};

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

/** A readable, high-entropy temporary password for a fresh/reset internal account. */
function generateTempPassword(): string {
  // ~13 chars, url-safe, plus a fixed suffix to guarantee symbol/number variety.
  return randomBytes(9).toString("base64url") + "9!";
}

async function emailInvite(
  user: { name: string; email: string; role: UserRole },
  tempPassword: string,
): Promise<void> {
  try {
    const email = renderUserInvite({
      name: user.name,
      email: user.email,
      roleLabel: ROLE_LABEL[user.role],
      temporaryPassword: tempPassword,
    });
    await sendEmail({
      template: "user_invite",
      to: user.email,
      recipientType: user.role === "PRINCIPAL_ADMIN" ? "admin" : "employee",
      ...email,
    });
  } catch (err) {
    // Invite email is best-effort; the account still exists and can be re-invited.
    logger.error("user.invite_email_failed", { email: user.email, error: String(err) });
  }
}

/** Create a new internal user with a temporary password and email an invite. */
export async function inviteUser(
  actorId: string,
  input: UserInviteInput,
): Promise<MutationResult> {
  const parsed = userInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, role, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "A user with that email already exists" };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name, email, role, phone: phone || null, passwordHash },
    });
    await recordAudit(
      { actorId, action: "user.create", entityType: "User", entityId: u.id, metadata: { email, role } },
      tx,
    );
    return u;
  });

  await emailInvite({ name, email, role }, tempPassword);
  return { ok: true, id: user.id };
}

/** Update a user's name, role, and phone. Records a role_change audit when the role moves. */
export async function updateUser(
  actorId: string,
  userId: string,
  input: UserEditInput,
): Promise<MutationResult> {
  const parsed = userEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, role, phone } = parsed.data;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!current) return { ok: false, error: "User not found" };

  // Guard against removing the last active principal admin via a role change.
  if (current.role === "PRINCIPAL_ADMIN" && role !== "PRINCIPAL_ADMIN") {
    const guard = await ensureNotLastAdmin(userId);
    if (guard) return guard;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { name, role, phone: phone || null } });
    await recordAudit(
      { actorId, action: "user.update", entityType: "User", entityId: userId, metadata: { name } },
      tx,
    );
    if (current.role !== role) {
      await recordAudit(
        {
          actorId,
          action: "user.role_change",
          entityType: "User",
          entityId: userId,
          metadata: { from: current.role, to: role },
        },
        tx,
      );
    }
  });

  return { ok: true, id: userId };
}

/** Activate or deactivate a user. Deactivating blocks sign-in (checked in auth). */
export async function setUserActive(
  actorId: string,
  userId: string,
  isActive: boolean,
): Promise<MutationResult> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!current) return { ok: false, error: "User not found" };
  if (current.isActive === isActive) return { ok: true, id: userId };

  if (!isActive) {
    if (userId === actorId) return { ok: false, error: "You cannot deactivate your own account" };
    if (current.role === "PRINCIPAL_ADMIN") {
      const guard = await ensureNotLastAdmin(userId);
      if (guard) return guard;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    await recordAudit(
      {
        actorId,
        action: isActive ? "user.activate" : "user.deactivate",
        entityType: "User",
        entityId: userId,
      },
      tx,
    );
  });

  return { ok: true, id: userId };
}

/** Reset a user's temporary password and re-send the invite email. */
export async function resendInvite(actorId: string, userId: string): Promise<MutationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await recordAudit(
      { actorId, action: "user.invite_resend", entityType: "User", entityId: userId },
      tx,
    );
  });

  await emailInvite({ name: user.name, email: user.email, role: user.role }, tempPassword);
  return { ok: true, id: userId };
}

/**
 * Returns an error result if `userId` is the only remaining active principal
 * admin, so we never lock the org out of the admin area. Returns null if safe.
 */
async function ensureNotLastAdmin(userId: string): Promise<MutationResult | null> {
  const otherAdmins = await prisma.user.count({
    where: { role: "PRINCIPAL_ADMIN", isActive: true, id: { not: userId } },
  });
  if (otherAdmins === 0) {
    return { ok: false, error: "At least one active principal administrator is required" };
  }
  return null;
}
