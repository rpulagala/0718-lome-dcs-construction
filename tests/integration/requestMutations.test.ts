import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { changeStatus, assignRequest, addNote, setPriority } from "@/lib/services/requestMutations";
import { workRequestSchema } from "@/lib/validation/workRequest";

let requestId = "";
let actorId = "";
let employeeId = "";

beforeAll(async () => {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL_ADMIN" } });
  const emp = await prisma.user.findFirstOrThrow({ where: { role: "EMPLOYEE" } });
  actorId = admin.id;
  employeeId = emp.id;

  const input = workRequestSchema.parse({
    fullName: "Mutation Tester",
    phone: "415-555-0170",
    email: `mut+${crypto.randomUUID()}@example.com`,
    street: "2 Test Ave",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Mutation test request description.",
    preferredContact: "PHONE",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey: crypto.randomUUID(),
    photos: [],
  });
  const res = await createWorkRequest(input);
  requestId = res.id;
});

describe("changeStatus", () => {
  it("applies a valid transition and records history + activity", async () => {
    const res = await changeStatus(actorId, requestId, "REVIEWING");
    expect(res.ok).toBe(true);

    const wr = await prisma.workRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { statusHistory: true, activities: true },
    });
    expect(wr.status).toBe("REVIEWING");
    expect(wr.statusHistory.some((s) => s.fromStatus === "NEW" && s.toStatus === "REVIEWING")).toBe(true);
    expect(wr.activities.some((a) => a.type === "STATUS_CHANGED")).toBe(true);
  });

  it("rejects an invalid transition", async () => {
    const res = await changeStatus(actorId, requestId, "COMPLETED");
    expect(res.ok).toBe(false);
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.status).toBe("REVIEWING"); // unchanged
  });
});

describe("assignRequest", () => {
  it("assigns and records assignment history + activity", async () => {
    const res = await assignRequest(actorId, requestId, employeeId);
    expect(res.ok).toBe(true);
    const wr = await prisma.workRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { assignmentHistory: true, activities: true },
    });
    expect(wr.assignedToId).toBe(employeeId);
    expect(wr.assignmentHistory.some((a) => a.assignedToId === employeeId)).toBe(true);
    expect(wr.activities.some((a) => a.type === "ASSIGNED")).toBe(true);
  });
});

describe("addNote + setPriority", () => {
  it("adds an internal note with a timeline entry", async () => {
    const res = await addNote(actorId, requestId, "Called customer, left message.", "INTERNAL");
    expect(res.ok).toBe(true);
    const notes = await prisma.workRequestNote.findMany({ where: { workRequestId: requestId } });
    expect(notes.some((n) => n.visibility === "INTERNAL")).toBe(true);
  });

  it("rejects an empty note", async () => {
    const res = await addNote(actorId, requestId, "   ", "INTERNAL");
    expect(res.ok).toBe(false);
  });

  it("updates priority", async () => {
    const res = await setPriority(actorId, requestId, "URGENT");
    expect(res.ok).toBe(true);
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.priority).toBe("URGENT");
  });
});

afterAll(async () => {
  const wr = await prisma.workRequest.findUnique({
    where: { id: requestId },
    select: { customerId: true, addressId: true },
  });
  await prisma.emailLog.deleteMany({ where: { relatedRequestId: requestId } });
  await prisma.notification.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestActivity.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestNote.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestAssignmentHistory.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequestStatusHistory.deleteMany({ where: { workRequestId: requestId } });
  await prisma.workRequest.deleteMany({ where: { id: requestId } });
  if (wr) {
    await prisma.address.deleteMany({ where: { id: wr.addressId } });
    await prisma.customer.deleteMany({ where: { id: wr.customerId } });
  }
  await prisma.$disconnect();
});
