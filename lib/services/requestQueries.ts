import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { RequestStatus, Priority } from "@/lib/generated/prisma/enums";

const TERMINAL: RequestStatus[] = ["COMPLETED", "DECLINED", "CANCELLED", "ARCHIVED"];

export async function dashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [
    newRequests,
    awaitingFirstContact,
    siteVisitsToSchedule,
    siteVisitsToday,
    estimatesPending,
    activeProjects,
    overdue,
    completedThisMonth,
  ] = await Promise.all([
    prisma.workRequest.count({ where: { status: "NEW", archivedAt: null } }),
    prisma.workRequest.count({
      where: { firstContactedAt: null, status: { in: ["NEW", "REVIEWING"] }, archivedAt: null },
    }),
    prisma.workRequest.count({ where: { status: "SITE_VISIT_TO_SCHEDULE", archivedAt: null } }),
    prisma.siteVisit.count({
      where: { scheduledDate: { gte: dayStart, lt: dayEnd }, status: { in: ["PROPOSED", "CONFIRMED"] } },
    }),
    prisma.workRequest.count({
      where: { status: { in: ["ESTIMATE_IN_PROGRESS", "ESTIMATE_SENT"] }, archivedAt: null },
    }),
    prisma.project.count({ where: { status: "IN_PROGRESS", archivedAt: null } }),
    prisma.workRequest.count({
      where: { firstContactedAt: null, responseDueAt: { lt: now }, status: { notIn: TERMINAL }, archivedAt: null },
    }),
    prisma.workRequest.count({
      where: { status: "COMPLETED", updatedAt: { gte: monthStart } },
    }),
  ]);

  return {
    newRequests,
    awaitingFirstContact,
    siteVisitsToSchedule,
    siteVisitsToday,
    estimatesPending,
    activeProjects,
    overdue,
    completedThisMonth,
  };
}

export interface ListParams {
  q?: string;
  status?: RequestStatus;
  categoryId?: string;
  assignedToId?: string;
  priority?: Priority;
  hasPhotos?: boolean;
  unassigned?: boolean;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listRequests(params: ListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 15;
  const now = new Date();

  const and: Prisma.WorkRequestWhereInput[] = [{ archivedAt: null }];

  if (params.status) and.push({ status: params.status });
  if (params.categoryId) and.push({ categoryId: params.categoryId });
  if (params.priority) and.push({ priority: params.priority });
  if (params.assignedToId) and.push({ assignedToId: params.assignedToId });
  if (params.unassigned) and.push({ assignedToId: null });
  if (params.hasPhotos) and.push({ photos: { some: {} } });
  if (params.overdue) {
    and.push({ firstContactedAt: null, responseDueAt: { lt: now }, status: { notIn: TERMINAL } });
  }
  if (params.q) {
    const q = params.q.trim();
    and.push({
      OR: [
        { requestNumber: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { customer: { fullName: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
        { address: { street: { contains: q, mode: "insensitive" } } },
        { address: { city: { contains: q, mode: "insensitive" } } },
        { address: { zip: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.WorkRequestWhereInput = { AND: and };

  const [rows, total] = await Promise.all([
    prisma.workRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { fullName: true, email: true, phone: true } },
        address: { select: { city: true, zip: true } },
        category: { select: { name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { photos: true } },
        siteVisits: {
          where: { status: { in: ["PROPOSED", "CONFIRMED", "RESCHEDULED"] } },
          orderBy: { scheduledDate: "asc" },
          take: 1,
          select: { scheduledDate: true },
        },
      },
    }),
    prisma.workRequest.count({ where }),
  ]);

  return { rows, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getRequestDetail(id: string) {
  return prisma.workRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      address: true,
      category: true,
      assignedTo: { select: { id: true, name: true } },
      photos: true,
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      statusHistory: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      assignmentHistory: {
        include: {
          assignedTo: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: { orderBy: { createdAt: "desc" } },
      tasks: { include: { assignee: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      siteVisits: {
        include: { assignedTo: { select: { name: true } }, history: true },
        orderBy: { scheduledDate: "desc" },
      },
      communications: {
        include: { loggedBy: { select: { name: true } } },
        orderBy: { occurredAt: "desc" },
      },
      estimates: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      project: {
        include: {
          projectManager: { select: { id: true, name: true } },
          milestones: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export type RequestDetail = NonNullable<Awaited<ReturnType<typeof getRequestDetail>>>;

/** Active employees + managers for assignment dropdowns. */
export async function assignableUsers() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ["EMPLOYEE", "MANAGER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

/** Active managers + principal admins — candidates to run a project. */
export async function managerCandidates() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ["MANAGER", "PRINCIPAL_ADMIN"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
