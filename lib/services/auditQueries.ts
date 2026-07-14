import { prisma } from "@/lib/db";

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorName: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface AuditPage {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated audit log, newest first, with the actor's name joined in. */
export async function listAuditLogs(
  page = 1,
  pageSize = 50,
): Promise<AuditPage> {
  const take = Math.min(Math.max(pageSize, 1), 200);
  const current = Math.max(page, 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * take,
      take,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  return {
    rows: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      actorName: l.actor?.name ?? null,
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
    total,
    page: current,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}
