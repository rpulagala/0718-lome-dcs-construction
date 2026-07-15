import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { toCustomerStatus, type CustomerStatus } from "@/lib/domain/status";
import { projectStatusLabel } from "@/lib/domain/projectStatus";
import { portalPhotoSrc } from "@/lib/portal/photoSrc";
import type { RequestStatus, ProjectStatus, AppointmentStatus } from "@/lib/generated/prisma/enums";

/**
 * Customer-portal read layer. EVERY query here is scoped to a single
 * `customerAccountId` (server-side) so a signed-in customer can only ever see
 * their own requests, projects, photos, estimates, and updates. Detail lookups
 * use `findFirst({ where: { id, customerAccountId } })` so an id from the client
 * that isn't owned by the account resolves to `null` (no IDOR). See §7 of
 * docs/CLIENT_APP_PLAN.md.
 */

/** Terminal statuses that live under the "Completed" segment. */
export const COMPLETED_STATUSES: RequestStatus[] = ["COMPLETED", "DECLINED", "CANCELLED", "ARCHIVED"];

export function isCompletedStatus(status: RequestStatus): boolean {
  return COMPLETED_STATUSES.includes(status);
}

/** Site-visit states a customer should ever be shown. */
const CUSTOMER_VISIBLE_VISITS: AppointmentStatus[] = [
  "PROPOSED",
  "CONFIRMED",
  "RESCHEDULED",
  "COMPLETED",
];

export interface PortalRequestRow {
  id: string;
  requestNumber: string;
  title: string;
  status: RequestStatus;
  customerStatus: CustomerStatus;
  updatedAt: Date;
  hasProject: boolean;
  projectStatusLabel: string | null;
  thumbUrl: string | null;
}

export interface PortalRequestList {
  active: PortalRequestRow[];
  completed: PortalRequestRow[];
}

function toRow(r: {
  id: string;
  requestNumber: string;
  categoryNameSnapshot: string;
  status: RequestStatus;
  updatedAt: Date;
  project: { status: ProjectStatus } | null;
  photos: { storageKey: string }[];
}): PortalRequestRow {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    title: r.categoryNameSnapshot,
    status: r.status,
    customerStatus: toCustomerStatus(r.status),
    updatedAt: r.updatedAt,
    hasProject: r.project != null,
    projectStatusLabel: r.project ? projectStatusLabel(r.project.status) : null,
    thumbUrl: r.photos[0] ? portalPhotoSrc(r.photos[0].storageKey) : null,
  };
}

/** All of the account's requests, split into Active / Completed buckets. */
export async function listPortalRequests(accountId: string): Promise<PortalRequestList> {
  const rows = await prisma.workRequest.findMany({
    where: { customerAccountId: accountId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      requestNumber: true,
      categoryNameSnapshot: true,
      status: true,
      updatedAt: true,
      project: { select: { status: true } },
      photos: { select: { storageKey: true }, take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  const active: PortalRequestRow[] = [];
  const completed: PortalRequestRow[] = [];
  for (const r of rows) {
    (isCompletedStatus(r.status) ? completed : active).push(toRow(r));
  }
  return { active, completed };
}

export interface PortalHomeSummary {
  activeCount: number;
  totalCount: number;
  activePreview: PortalRequestRow[];
  recentUpdates: {
    id: string;
    summary: string;
    createdAt: Date;
    requestNumber: string;
    requestId: string;
  }[];
}

/** Counts + a small preview of active work + the latest customer-visible updates. */
export async function portalHomeSummary(accountId: string): Promise<PortalHomeSummary> {
  const { active } = await listPortalRequests(accountId);

  const [totalCount, updates] = await Promise.all([
    prisma.workRequest.count({ where: { customerAccountId: accountId } }),
    prisma.workRequestActivity.findMany({
      where: { isCustomerVisible: true, workRequest: { customerAccountId: accountId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        summary: true,
        createdAt: true,
        workRequestId: true,
        workRequest: { select: { requestNumber: true } },
      },
    }),
  ]);

  return {
    activeCount: active.length,
    totalCount,
    activePreview: active.slice(0, 3),
    recentUpdates: updates.map((u) => ({
      id: u.id,
      summary: u.summary,
      createdAt: u.createdAt,
      requestId: u.workRequestId,
      requestNumber: u.workRequest.requestNumber,
    })),
  };
}

export interface PortalPhoto {
  id: string;
  fileName: string;
  src: string;
}

export interface PortalEstimate {
  id: string;
  estimateNumber: string;
  statusLabel: string;
  amountLabel: string;
  customerNotes: string | null;
  sentAt: Date | null;
  expiresAt: Date | null;
  /** True when the customer can still accept/decline (SENT and not past expiry). */
  canRespond: boolean;
}

export interface PortalSiteVisit {
  id: string;
  scheduledDate: Date;
  startTime: Date | null;
  endTime: Date | null;
  status: AppointmentStatus;
  customerInstructions: string | null;
}

export interface PortalMilestone {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completedAt: Date | null;
  done: boolean;
}

export interface PortalProject {
  name: string;
  statusLabel: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  contractAmountLabel: string | null;
  teamLead: string | null;
  milestones: PortalMilestone[];
  milestonesDone: number;
  milestonesTotal: number;
  progressPct: number;
}

export interface PortalRequestDetail {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  status: RequestStatus;
  customerStatus: CustomerStatus;
  submittedAt: Date;
  address: { street: string; unit: string | null; city: string; state: string; zip: string };
  photos: PortalPhoto[];
  notes: { id: string; body: string; createdAt: Date; author: string }[];
  updates: { id: string; summary: string; createdAt: Date }[];
  siteVisits: PortalSiteVisit[];
  estimates: PortalEstimate[];
  project: PortalProject | null;
}

/**
 * A single request, scoped to the owning account, shaped to expose ONLY
 * customer-appropriate fields (customer-visible notes, sent estimates, the
 * customer's own address, "your team" lead — never internal notes, staff
 * assignments, or internal statuses). Returns `null` when the request isn't
 * owned by `accountId`.
 */
export async function getPortalRequestDetail(
  accountId: string,
  requestId: string,
): Promise<PortalRequestDetail | null> {
  const r = await prisma.workRequest.findFirst({
    where: { id: requestId, customerAccountId: accountId },
    select: {
      id: true,
      requestNumber: true,
      categoryNameSnapshot: true,
      description: true,
      status: true,
      createdAt: true,
      address: { select: { street: true, unit: true, city: true, state: true, zip: true } },
      photos: {
        select: { id: true, fileName: true, storageKey: true },
        orderBy: { createdAt: "asc" },
      },
      notes: {
        where: { visibility: "CUSTOMER_VISIBLE" },
        select: { id: true, body: true, createdAt: true, author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        where: { isCustomerVisible: true },
        select: { id: true, summary: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      siteVisits: {
        where: { status: { in: CUSTOMER_VISIBLE_VISITS } },
        select: {
          id: true,
          scheduledDate: true,
          startTime: true,
          endTime: true,
          status: true,
          customerInstructions: true,
        },
        orderBy: { scheduledDate: "desc" },
      },
      // Only estimates actually sent to the customer.
      estimates: {
        where: { sentAt: { not: null } },
        select: {
          id: true,
          estimateNumber: true,
          status: true,
          amount: true,
          customerNotes: true,
          sentAt: true,
          expiresAt: true,
        },
        orderBy: { sentAt: "desc" },
      },
      project: {
        select: {
          name: true,
          status: true,
          plannedStartDate: true,
          plannedEndDate: true,
          actualStartDate: true,
          actualEndDate: true,
          contractAmount: true,
          projectManager: { select: { name: true } },
          milestones: {
            select: { id: true, title: true, description: true, dueAt: true, completedAt: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!r) return null;

  const project: PortalProject | null = r.project
    ? (() => {
        const milestones: PortalMilestone[] = r.project!.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          dueAt: m.dueAt,
          completedAt: m.completedAt,
          done: m.completedAt != null,
        }));
        const total = milestones.length;
        const done = milestones.filter((m) => m.done).length;
        return {
          name: r.project!.name,
          statusLabel: projectStatusLabel(r.project!.status),
          plannedStartDate: r.project!.plannedStartDate,
          plannedEndDate: r.project!.plannedEndDate,
          actualStartDate: r.project!.actualStartDate,
          actualEndDate: r.project!.actualEndDate,
          contractAmountLabel: r.project!.contractAmount ? formatMoney(r.project!.contractAmount) : null,
          teamLead: r.project!.projectManager?.name ?? null,
          milestones,
          milestonesDone: done,
          milestonesTotal: total,
          progressPct: total === 0 ? 0 : Math.round((done / total) * 100),
        };
      })()
    : null;

  return {
    id: r.id,
    requestNumber: r.requestNumber,
    title: r.categoryNameSnapshot,
    description: r.description,
    status: r.status,
    customerStatus: toCustomerStatus(r.status),
    submittedAt: r.createdAt,
    address: r.address,
    photos: r.photos.map((p) => ({ id: p.id, fileName: p.fileName, src: portalPhotoSrc(p.storageKey) })),
    notes: r.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt, author: n.author.name })),
    updates: r.activities.map((a) => ({ id: a.id, summary: a.summary, createdAt: a.createdAt })),
    siteVisits: r.siteVisits,
    estimates: r.estimates.map((e) => ({
      id: e.id,
      estimateNumber: e.estimateNumber,
      statusLabel: estimateStatusLabel(e.status),
      amountLabel: formatMoney(e.amount),
      customerNotes: e.customerNotes,
      sentAt: e.sentAt,
      expiresAt: e.expiresAt,
      canRespond: e.status === "SENT" && (e.expiresAt == null || e.expiresAt.getTime() >= Date.now()),
    })),
    project,
  };
}

/** Customer-friendly estimate status wording. */
function estimateStatusLabel(status: string): string {
  switch (status) {
    case "SENT":
      return "Awaiting your decision";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "EXPIRED":
      return "Expired";
    case "REVISED":
      return "Revised";
    default:
      return "Sent";
  }
}
