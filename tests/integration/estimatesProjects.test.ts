import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { changeStatus } from "@/lib/services/requestMutations";
import {
  createEstimate,
  updateEstimate,
  changeEstimateStatus,
  reviseEstimate,
} from "@/lib/services/estimates";
import {
  createProjectFromEstimate,
  changeProjectStatus,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
} from "@/lib/services/projects";
import { workRequestSchema } from "@/lib/validation/workRequest";
import { parseRequestNumber } from "@/lib/domain/requestNumber";

let requestId = "";
let actorId = "";

beforeAll(async () => {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL_ADMIN" } });
  actorId = admin.id;

  const input = workRequestSchema.parse({
    fullName: "Estimate Customer",
    phone: "415-555-0190",
    email: `estcust+${crypto.randomUUID()}@example.com`,
    street: "12 Estimate Ave",
    city: "Bid Town",
    state: "CA",
    zip: "94570",
    categoryId: category.id,
    description: "Estimate/project integration test request.",
    preferredContact: "EMAIL",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey: crypto.randomUUID(),
    photos: [],
  });
  const res = await createWorkRequest(input);
  requestId = res.id;

  // Drive the request to a state where an estimate is expected.
  await changeStatus(actorId, requestId, "REVIEWING");
  await changeStatus(actorId, requestId, "SITE_VISIT_TO_SCHEDULE");
  await changeStatus(actorId, requestId, "SITE_VISIT_SCHEDULED");
  await changeStatus(actorId, requestId, "SITE_VISIT_COMPLETED");
});

let estimateId = "";
let projectId = "";

describe("estimate lifecycle", () => {
  it("creates a draft estimate with an EST number and advances the request", async () => {
    const res = await createEstimate(actorId, requestId, {
      description: "Full labor + materials",
      amount: "18500.00",
      expiresAt: "",
      internalNotes: "Assumes existing framing is sound.",
      customerNotes: "Includes cleanup.",
    });
    expect(res.ok).toBe(true);
    estimateId = res.estimateId!;
    expect(parseRequestNumber(res.estimateNumber!.replace("EST", "DCS"))).not.toBeNull();

    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: estimateId } });
    expect(est.status).toBe("DRAFT");
    expect(est.amount?.toString()).toBe("18500");

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("ESTIMATE_IN_PROGRESS");
  });

  it("edits an editable estimate", async () => {
    const res = await updateEstimate(actorId, estimateId, {
      description: "Full labor + materials (revised scope)",
      amount: "19250.50",
      expiresAt: "2026-12-31",
      internalNotes: "",
      customerNotes: "Includes cleanup and haul-away.",
    });
    expect(res.ok).toBe(true);
    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: estimateId } });
    expect(est.amount?.toString()).toBe("19250.5");
    expect(est.expiresAt).not.toBeNull();
  });

  it("sends the estimate: stamps sentAt, advances request, logs an email", async () => {
    const res = await changeEstimateStatus(actorId, estimateId, "SENT");
    expect(res.ok).toBe(true);

    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: estimateId } });
    expect(est.status).toBe("SENT");
    expect(est.sentAt).not.toBeNull();

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("ESTIMATE_SENT");

    const logs = await prisma.emailLog.findMany({
      where: { relatedRequestId: requestId, template: "estimate_sent" },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("rejects editing a sent estimate", async () => {
    const res = await updateEstimate(actorId, estimateId, {
      description: "nope",
      amount: "1",
      expiresAt: "",
      internalNotes: "",
      customerNotes: "",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects an invalid status jump", async () => {
    const res = await changeEstimateStatus(actorId, estimateId, "DRAFT");
    expect(res.ok).toBe(false);
  });

  it("accepts the estimate and advances the request to APPROVED", async () => {
    const res = await changeEstimateStatus(actorId, estimateId, "ACCEPTED");
    expect(res.ok).toBe(true);
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("APPROVED");
  });
});

describe("project conversion", () => {
  it("converts an accepted estimate into a project and advances the request", async () => {
    const res = await createProjectFromEstimate(actorId, estimateId, {
      name: "Bid Town Remodel",
      projectManagerId: "",
      contractAmount: "",
      plannedStartDate: "2026-08-01",
      plannedEndDate: "2026-10-01",
      internalNotes: "Kickoff after permit.",
    });
    expect(res.ok).toBe(true);
    projectId = res.projectId!;

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe("PLANNED");
    // Contract amount defaults from the estimate when not supplied.
    expect(project.contractAmount?.toString()).toBe("19250.5");

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("PROJECT_SCHEDULED");
  });

  it("blocks a second project for the same request", async () => {
    const res = await createProjectFromEstimate(actorId, estimateId, {
      name: "Duplicate",
      projectManagerId: "",
      contractAmount: "",
      plannedStartDate: "",
      plannedEndDate: "",
      internalNotes: "",
    });
    expect(res.ok).toBe(false);
  });

  it("adds, completes, and removes milestones", async () => {
    const m1 = await addMilestone(actorId, projectId, { title: "Demo", description: "", dueAt: "" });
    const m2 = await addMilestone(actorId, projectId, { title: "Rough-in", description: "", dueAt: "2026-08-15" });
    expect(m1.ok && m2.ok).toBe(true);

    const toggled = await toggleMilestone(actorId, m1.milestoneId!, true);
    expect(toggled.ok).toBe(true);
    const done = await prisma.projectMilestone.findUniqueOrThrow({ where: { id: m1.milestoneId! } });
    expect(done.completedAt).not.toBeNull();
    // Appended milestone gets the next sort order.
    const second = await prisma.projectMilestone.findUniqueOrThrow({ where: { id: m2.milestoneId! } });
    expect(second.sortOrder).toBeGreaterThan(done.sortOrder);

    const removed = await deleteMilestone(actorId, m2.milestoneId!);
    expect(removed.ok).toBe(true);
    expect(await prisma.projectMilestone.count({ where: { projectId } })).toBe(1);
  });

  it("starts the project and mirrors the status onto the request", async () => {
    const res = await changeProjectStatus(actorId, projectId, "IN_PROGRESS");
    expect(res.ok).toBe(true);

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe("IN_PROGRESS");
    expect(project.actualStartDate).not.toBeNull();

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("IN_PROGRESS");
  });

  it("rejects an invalid project transition", async () => {
    const res = await changeProjectStatus(actorId, projectId, "PLANNED");
    expect(res.ok).toBe(false);
  });
});

describe("estimate revision", () => {
  it("supersedes a sent estimate with a fresh draft", async () => {
    const draft = await createEstimate(actorId, requestId, {
      description: "Alt scope",
      amount: "9000",
      expiresAt: "",
      internalNotes: "",
      customerNotes: "",
    });
    await changeEstimateStatus(actorId, draft.estimateId!, "SENT");

    const revised = await reviseEstimate(actorId, draft.estimateId!);
    expect(revised.ok).toBe(true);
    expect(revised.estimateId).not.toBe(draft.estimateId);

    const original = await prisma.estimate.findUniqueOrThrow({ where: { id: draft.estimateId! } });
    expect(original.status).toBe("REVISED");
    const copy = await prisma.estimate.findUniqueOrThrow({ where: { id: revised.estimateId! } });
    expect(copy.status).toBe("DRAFT");
    expect(copy.amount?.toString()).toBe("9000");
  });
});

afterAll(async () => {
  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    select: { customerId: true, addressId: true },
  });
  await prisma.projectMilestone.deleteMany({ where: { project: { workRequestId: requestId } } });
  await prisma.project.deleteMany({ where: { workRequestId: requestId } });
  await prisma.estimate.deleteMany({ where: { workRequestId: requestId } });
  await prisma.emailLog.deleteMany({ where: { relatedRequestId: requestId } });
  await prisma.notification.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestActivity.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestStatusHistory.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequest.deleteMany({ where: { id: requestId } });
  if (wr) {
    await prisma.address.deleteMany({ where: { id: wr.addressId } });
    await prisma.customer.deleteMany({ where: { id: wr.customerId } });
  }
  await prisma.$disconnect();
});
