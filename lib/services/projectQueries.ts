import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ProjectStatus } from "@/lib/generated/prisma/enums";

const ACTIVE: ProjectStatus[] = ["PLANNED", "IN_PROGRESS", "ON_HOLD"];

export interface ProjectListParams {
  status?: ProjectStatus;
  projectManagerId?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/** Paginated project list for the cross-project manager view. */
export async function listProjects(params: ProjectListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;

  const and: Prisma.ProjectWhereInput[] = [];
  if (params.status) and.push({ status: params.status });
  if (params.projectManagerId) and.push({ projectManagerId: params.projectManagerId });
  if (params.activeOnly) and.push({ status: { in: ACTIVE }, archivedAt: null });

  const where: Prisma.ProjectWhereInput = and.length ? { AND: and } : {};

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { fullName: true } },
        projectManager: { select: { name: true } },
        workRequest: { select: { id: true, requestNumber: true } },
        _count: { select: { milestones: true } },
        milestones: { where: { completedAt: { not: null } }, select: { id: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return { rows, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
