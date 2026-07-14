import { prisma } from "@/lib/db";
import type { ProjectStatus } from "@/lib/generated/prisma/enums";
import { canTransitionProject, requestStatusForProject } from "@/lib/domain/projectStatus";
import {
  projectSchema,
  projectUpdateSchema,
  milestoneSchema,
  type ProjectInput,
  type ProjectUpdateInput,
  type MilestoneInput,
} from "@/lib/validation/estimate";
import { advanceRequestStatusTx } from "./statusAdvance";
import { recordAudit } from "./audit";

export interface ProjectResult {
  ok: boolean;
  error?: string;
  projectId?: string;
  milestoneId?: string;
}

function text(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function money(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function dateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Convert an accepted estimate into a tracked project. The estimate must be
 * ACCEPTED and its request must not already have a project. The parent request
 * advances to PROJECT_SCHEDULED.
 */
export async function createProjectFromEstimate(
  actorId: string,
  estimateId: string,
  input: ProjectInput,
): Promise<ProjectResult> {
  const parsed = projectSchema.parse(input);
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    include: {
      project: { select: { id: true } },
      workRequest: {
        select: {
          id: true,
          status: true,
          customerId: true,
          addressId: true,
          project: { select: { id: true } },
        },
      },
    },
  });
  if (!estimate) return { ok: false, error: "Estimate not found" };
  if (estimate.status !== "ACCEPTED") {
    return { ok: false, error: "Only an accepted estimate can be converted to a project" };
  }
  if (estimate.project || estimate.workRequest.project) {
    return { ok: false, error: "This request already has a project" };
  }

  const wr = estimate.workRequest;
  const contractAmount = money(parsed.contractAmount) ?? (estimate.amount ? estimate.amount.toString() : null);

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: parsed.name,
        workRequestId: wr.id,
        estimateId: estimate.id,
        customerId: wr.customerId,
        addressId: wr.addressId,
        projectManagerId: text(parsed.projectManagerId),
        status: "PLANNED",
        contractAmount,
        plannedStartDate: dateOnly(parsed.plannedStartDate),
        plannedEndDate: dateOnly(parsed.plannedEndDate),
        internalNotes: text(parsed.internalNotes),
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: wr.id,
        type: "PROJECT_CREATED",
        summary: `Project "${parsed.name}" created`,
        isCustomerVisible: true,
      },
    });
    await advanceRequestStatusTx(tx, wr, "PROJECT_SCHEDULED", actorId, "Project created");
    await recordAudit(
      { actorId, action: "project.create", entityType: "Project", entityId: p.id, metadata: { name: parsed.name } },
      tx,
    );
    return p;
  });

  return { ok: true, projectId: project.id };
}

/** Edit a project's core fields (name, PM, dates, contract amount, notes). */
export async function updateProject(
  actorId: string,
  projectId: string,
  input: ProjectUpdateInput,
): Promise<ProjectResult> {
  const parsed = projectUpdateSchema.parse(input);
  const existing = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!existing) return { ok: false, error: "Project not found" };

  const data: Record<string, unknown> = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.projectManagerId !== undefined) data.projectManagerId = text(parsed.projectManagerId);
  if (parsed.contractAmount !== undefined) data.contractAmount = money(parsed.contractAmount);
  if (parsed.plannedStartDate !== undefined) data.plannedStartDate = dateOnly(parsed.plannedStartDate);
  if (parsed.plannedEndDate !== undefined) data.plannedEndDate = dateOnly(parsed.plannedEndDate);
  if (parsed.actualStartDate !== undefined) data.actualStartDate = dateOnly(parsed.actualStartDate);
  if (parsed.actualEndDate !== undefined) data.actualEndDate = dateOnly(parsed.actualEndDate);
  if (parsed.internalNotes !== undefined) data.internalNotes = text(parsed.internalNotes);

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data });
    await recordAudit(
      { actorId, action: "project.update", entityType: "Project", entityId: projectId },
      tx,
    );
  });

  return { ok: true, projectId };
}

/**
 * Advance a project's status through its guarded state machine and mirror the
 * change onto the parent request (best-effort) and its timeline. Sets
 * actualStartDate/actualEndDate automatically on first IN_PROGRESS / COMPLETED.
 */
export async function changeProjectStatus(
  actorId: string,
  projectId: string,
  toStatus: ProjectStatus,
): Promise<ProjectResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      status: true,
      actualStartDate: true,
      workRequestId: true,
      workRequest: { select: { id: true, status: true } },
    },
  });
  if (!project) return { ok: false, error: "Project not found" };
  if (!canTransitionProject(project.status, toStatus)) {
    return { ok: false, error: `Cannot move project from ${project.status} to ${toStatus}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        status: toStatus,
        ...(toStatus === "IN_PROGRESS" && !project.actualStartDate ? { actualStartDate: new Date() } : {}),
        ...(toStatus === "COMPLETED" ? { actualEndDate: new Date() } : {}),
        ...(toStatus === "CANCELLED" ? { archivedAt: new Date() } : {}),
      },
    });
    if (project.workRequest) {
      await tx.workRequestActivity.create({
        data: {
          workRequestId: project.workRequest.id,
          type: "STATUS_CHANGED",
          summary: `Project "${project.name}" is now ${toStatus.replace(/_/g, " ").toLowerCase()}`,
        },
      });
      await advanceRequestStatusTx(
        tx,
        project.workRequest,
        requestStatusForProject(toStatus),
        actorId,
        "Project status changed",
      );
    }
    await recordAudit(
      {
        actorId,
        action: "project.status_change",
        entityType: "Project",
        entityId: projectId,
        metadata: { from: project.status, to: toStatus },
      },
      tx,
    );
  });

  return { ok: true, projectId };
}

/** Add a milestone to a project (appended after the current last one). */
export async function addMilestone(
  actorId: string,
  projectId: string,
  input: MilestoneInput,
): Promise<ProjectResult> {
  const parsed = milestoneSchema.parse(input);
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return { ok: false, error: "Project not found" };

  const last = await prisma.projectMilestone.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const milestone = await prisma.$transaction(async (tx) => {
    const m = await tx.projectMilestone.create({
      data: {
        projectId,
        title: parsed.title,
        description: text(parsed.description),
        dueAt: dateOnly(parsed.dueAt),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    await recordAudit(
      { actorId, action: "project.milestone", entityType: "ProjectMilestone", entityId: m.id, metadata: { action: "create" } },
      tx,
    );
    return m;
  });

  return { ok: true, projectId, milestoneId: milestone.id };
}

/** Mark a milestone complete or incomplete. */
export async function toggleMilestone(
  actorId: string,
  milestoneId: string,
  complete: boolean,
): Promise<ProjectResult> {
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, projectId: true },
  });
  if (!milestone) return { ok: false, error: "Milestone not found" };

  await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: { completedAt: complete ? new Date() : null },
  });
  await recordAudit({
    actorId,
    action: "project.milestone",
    entityType: "ProjectMilestone",
    entityId: milestoneId,
    metadata: { action: complete ? "complete" : "reopen" },
  });

  return { ok: true, projectId: milestone.projectId, milestoneId };
}

/** Remove a milestone from a project. */
export async function deleteMilestone(
  actorId: string,
  milestoneId: string,
): Promise<ProjectResult> {
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, projectId: true },
  });
  if (!milestone) return { ok: false, error: "Milestone not found" };

  await prisma.projectMilestone.delete({ where: { id: milestoneId } });
  await recordAudit({
    actorId,
    action: "project.milestone",
    entityType: "ProjectMilestone",
    entityId: milestoneId,
    metadata: { action: "delete" },
  });

  return { ok: true, projectId: milestone.projectId };
}
