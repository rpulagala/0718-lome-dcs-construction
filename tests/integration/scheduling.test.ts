import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { changeStatus } from "@/lib/services/requestMutations";
import {
  scheduleSiteVisit,
  rescheduleSiteVisit,
  cancelSiteVisit,
  completeSiteVisit,
} from "@/lib/services/scheduling";
import { logCommunication, createTask, toggleTask } from "@/lib/services/communication";
import { workRequestSchema } from "@/lib/validation/workRequest";

let requestId = "";
let actorId = "";
let employeeId = "";

/** A date string N days from today (YYYY-MM-DD), far enough out to avoid seed data. */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

beforeAll(async () => {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL_ADMIN" } });
  actorId = admin.id;

  // Dedicated employee so the double-booking guard never collides with seed visits.
  const emp = await prisma.user.create({
    data: {
      email: `sched+${crypto.randomUUID()}@example.com`,
      name: "Scheduling Tester",
      passwordHash: "x",
      role: "EMPLOYEE",
    },
  });
  employeeId = emp.id;

  const input = workRequestSchema.parse({
    fullName: "Schedule Customer",
    phone: "415-555-0180",
    email: `schedcust+${crypto.randomUUID()}@example.com`,
    street: "9 Visit Way",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Scheduling integration test request.",
    preferredContact: "EMAIL",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey: crypto.randomUUID(),
    photos: [],
  });
  const res = await createWorkRequest(input);
  requestId = res.id;

  // Move to a state where a site visit is expected.
  await changeStatus(actorId, requestId, "REVIEWING");
  await changeStatus(actorId, requestId, "SITE_VISIT_TO_SCHEDULE");
});

let visitAId = "";
let visitBId = "";

describe("scheduleSiteVisit", () => {
  it("schedules a visit, records history + activity, advances the request status", async () => {
    const res = await scheduleSiteVisit(actorId, requestId, {
      date: futureDate(120),
      startTime: "10:00",
      endTime: "11:00",
      assignedToId: employeeId,
      addressId: "",
      confirmed: true,
      notifyCustomer: true,
      customerInstructions: "Gate code 1234.",
      internalInstructions: "Bring the long ladder.",
    });
    expect(res.ok).toBe(true);
    visitAId = res.siteVisitId!;

    const visit = await prisma.siteVisit.findUniqueOrThrow({
      where: { id: visitAId },
      include: { history: true },
    });
    expect(visit.status).toBe("CONFIRMED");
    expect(visit.assignedToId).toBe(employeeId);
    expect(visit.history.some((h) => h.changeType === "created")).toBe(true);

    const wr = await prisma.workRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { activities: true },
    });
    expect(wr.status).toBe("SITE_VISIT_SCHEDULED");
    expect(wr.activities.some((a) => a.type === "SITE_VISIT_SCHEDULED")).toBe(true);
  });

  it("logs a customer notification email for the schedule", async () => {
    const logs = await prisma.emailLog.findMany({
      where: { relatedRequestId: requestId, template: "site_visit_scheduled" },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("blocks a double-booking for the same employee at an overlapping time", async () => {
    const res = await scheduleSiteVisit(actorId, requestId, {
      date: futureDate(120),
      startTime: "10:30",
      endTime: "11:30",
      assignedToId: employeeId,
      addressId: "",
      confirmed: false,
      notifyCustomer: false,
      customerInstructions: "",
      internalInstructions: "",
    });
    expect(res.ok).toBe(false);
    expect(res.conflict).toBe(true);
  });

  it("allows a non-overlapping second visit for the same employee", async () => {
    const res = await scheduleSiteVisit(actorId, requestId, {
      date: futureDate(120),
      startTime: "13:00",
      endTime: "14:00",
      assignedToId: employeeId,
      addressId: "",
      confirmed: false,
      notifyCustomer: false,
      customerInstructions: "",
      internalInstructions: "",
    });
    expect(res.ok).toBe(true);
    visitBId = res.siteVisitId!;
  });
});

describe("rescheduleSiteVisit", () => {
  it("moves the visit and records a rescheduled history entry", async () => {
    const res = await rescheduleSiteVisit(actorId, visitAId, {
      date: futureDate(121),
      startTime: "09:00",
      endTime: "10:00",
      assignedToId: employeeId,
      addressId: "",
      confirmed: false,
      notifyCustomer: true,
      customerInstructions: "",
      internalInstructions: "",
    });
    expect(res.ok).toBe(true);

    const visit = await prisma.siteVisit.findUniqueOrThrow({
      where: { id: visitAId },
      include: { history: true },
    });
    expect(visit.status).toBe("RESCHEDULED");
    expect(visit.history.some((h) => h.changeType === "rescheduled")).toBe(true);
  });
});

describe("cancelSiteVisit", () => {
  it("cancels a visit but keeps the request scheduled while another is active", async () => {
    const res = await cancelSiteVisit(actorId, visitBId, "Customer requested change");
    expect(res.ok).toBe(true);

    const visit = await prisma.siteVisit.findUniqueOrThrow({ where: { id: visitBId } });
    expect(visit.status).toBe("CANCELLED");
    expect(visit.cancellationReason).toBe("Customer requested change");

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("SITE_VISIT_SCHEDULED"); // visit A still active
  });
});

describe("completeSiteVisit", () => {
  it("completes the remaining visit and advances the request", async () => {
    const res = await completeSiteVisit(actorId, visitAId);
    expect(res.ok).toBe(true);

    const visit = await prisma.siteVisit.findUniqueOrThrow({ where: { id: visitAId } });
    expect(visit.status).toBe("COMPLETED");

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("SITE_VISIT_COMPLETED");
  });
});

describe("communication + tasks", () => {
  it("logs a communication with a timeline activity", async () => {
    const res = await logCommunication(actorId, requestId, {
      channel: "PHONE",
      direction: "OUTBOUND",
      summary: "Called to confirm the visit window.",
    });
    expect(res.ok).toBe(true);

    const comms = await prisma.communication.findMany({ where: { workRequestId: requestId } });
    expect(comms.length).toBe(1);
    const acts = await prisma.workRequestActivity.findMany({
      where: { workRequestId: requestId, type: "COMMUNICATION_LOGGED" },
    });
    expect(acts.length).toBe(1);
  });

  it("creates and completes a follow-up task", async () => {
    const created = await createTask(actorId, requestId, {
      title: "Send estimate draft",
      dueAt: futureDate(3),
      assigneeId: employeeId,
    });
    expect(created.ok).toBe(true);

    const toggled = await toggleTask(actorId, created.id!, true);
    expect(toggled.ok).toBe(true);

    const task = await prisma.task.findUniqueOrThrow({ where: { id: created.id! } });
    expect(task.isComplete).toBe(true);
    expect(task.completedAt).not.toBeNull();
  });
});

afterAll(async () => {
  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    select: { customerId: true, addressId: true },
  });
  const visitIds = (
    await prisma.siteVisit.findMany({ where: { workRequestId: requestId }, select: { id: true } })
  ).map((v) => v.id);
  await prisma.siteVisitHistory.deleteMany({ where: { siteVisitId: { in: visitIds } } });
  await prisma.siteVisit.deleteMany({ where: { workRequestId: requestId } });
  await prisma.task.deleteMany({ where: { workRequestId: requestId } });
  await prisma.communication.deleteMany({ where: { workRequestId: requestId } });
  await prisma.emailLog.deleteMany({ where: { relatedRequestId: requestId } });
  await prisma.notification.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestActivity.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestStatusHistory.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestAssignmentHistory.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequest.deleteMany({ where: { id: requestId } });
  if (wr) {
    await prisma.address.deleteMany({ where: { id: wr.addressId } });
    await prisma.customer.deleteMany({ where: { id: wr.customerId } });
  }
  await prisma.user.deleteMany({ where: { id: employeeId } });
  await prisma.$disconnect();
});
