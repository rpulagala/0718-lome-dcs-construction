import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Canonical audit action names. Keep these stable — they are stored verbatim in
 * `AuditLog.action` and surfaced in the admin audit view. See docs/SECURITY.md §Audit
 * for the event list this taxonomy covers.
 */
export type AuditAction =
  | "auth.login"
  | "user.create"
  | "user.update"
  | "user.role_change"
  | "user.activate"
  | "user.deactivate"
  | "user.invite_resend"
  | "category.create"
  | "category.update"
  | "category.reorder"
  | "category.activate"
  | "category.deactivate"
  | "category.delete"
  | "settings.update";

export interface AuditEntry {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/**
 * Append an audit record. Auditing must never break the action it records, so a
 * write failure is logged and swallowed rather than thrown. Pass a transaction
 * client as `tx` to make the audit atomic with the mutation it describes.
 */
export async function recordAudit(
  entry: AuditEntry,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never let an audit-write failure surface to the user. If `tx` was supplied
    // the surrounding transaction will still roll back on a genuine DB fault; in
    // the common case we simply log and move on.
    logger.error("audit.write_failed", {
      action: entry.action,
      entityType: entry.entityType,
      error: String(err),
    });
    if (tx) throw err;
  }
}
