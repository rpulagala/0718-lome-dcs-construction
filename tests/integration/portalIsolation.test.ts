import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";
import { listPortalRequests, getPortalRequestDetail } from "@/lib/services/portalData";
import {
  listPortalThreads,
  getPortalThread,
  sendPortalMessage,
  markPortalThreadRead,
  portalUnreadTotal,
} from "@/lib/services/messaging";
import { respondToPortalEstimate } from "@/lib/services/portalEstimates";

/**
 * Consolidated data-isolation / IDOR suite (§7 of docs/CLIENT_APP_PLAN.md — the
 * #1 security priority). One "victim" account (A) owns a request with a SENT
 * estimate and an unread staff message; an "attacker" account (B) owns a
 * different request. Every customer-facing portal service must refuse B any
 * read/write/state-change on A's records, and leave A's data untouched.
 */

const requestIds: string[] = [];
const accountIds: string[] = [];

async function makeAccountWithRequest(status: "ESTIMATE_SENT" | "NEW"): Promise<{
  requestId: string;
  accountId: string;
}> {
  const email = `iso+${crypto.randomUUID().slice(0, 8)}@example.com`;
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const input = workRequestSchema.parse({
    fullName: "Isolation Subject",
    phone: "415-555-0200",
    email,
    street: "1 Isolation Way",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Isolation suite request.",
    preferredContact: "EMAIL",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey: crypto.randomUUID(),
    photos: [],
  });
  const res = await createWorkRequest(input);
  requestIds.push(res.id);
  const account = await prisma.customerAccount.upsert({
    where: { email },
    update: {},
    create: { email, name: "Isolation Subject" },
  });
  accountIds.push(account.id);
  await prisma.workRequest.update({
    where: { id: res.id },
    data: { customerAccountId: account.id, status },
  });
  return { requestId: res.id, accountId: account.id };
}

let A = { requestId: "", accountId: "" };
let B = { requestId: "", accountId: "" };
let aEstimateId = "";

beforeAll(async () => {
  A = await makeAccountWithRequest("ESTIMATE_SENT");
  B = await makeAccountWithRequest("NEW");

  const est = await prisma.estimate.create({
    data: {
      estimateNumber: `EST-ISO-${crypto.randomUUID().slice(0, 8)}`,
      workRequestId: A.requestId,
      status: "SENT",
      amount: "9000",
      sentAt: new Date(),
    },
  });
  aEstimateId = est.id;

  // An unread staff→customer message on A's request.
  const staff = await prisma.user.findFirstOrThrow();
  await prisma.clientMessage.create({
    data: {
      workRequestId: A.requestId,
      senderType: "STAFF",
      authorUserId: staff.id,
      body: "Private staff message to A.",
      readAt: null,
    },
  });
});

describe("portal data isolation (attacker B vs victim A)", () => {
  it("A can see its own data (positive control)", async () => {
    expect(await getPortalRequestDetail(A.accountId, A.requestId)).not.toBeNull();
    expect(await getPortalThread(A.accountId, A.requestId)).not.toBeNull();
    expect(await portalUnreadTotal(A.accountId)).toBeGreaterThan(0);
  });

  it("listPortalRequests never leaks A's request to B", async () => {
    const list = await listPortalRequests(B.accountId);
    const ids = [...list.active, ...list.completed].map((r) => r.id);
    expect(ids).toContain(B.requestId);
    expect(ids).not.toContain(A.requestId);
  });

  it("getPortalRequestDetail refuses A's request for B", async () => {
    expect(await getPortalRequestDetail(B.accountId, A.requestId)).toBeNull();
  });

  it("getPortalThread refuses A's thread for B", async () => {
    expect(await getPortalThread(B.accountId, A.requestId)).toBeNull();
  });

  it("listPortalThreads / portalUnreadTotal never surface A's thread to B", async () => {
    const threads = await listPortalThreads(B.accountId);
    expect(threads.map((t) => t.requestId)).not.toContain(A.requestId);
    // B has no staff messages of its own, so its unread total is 0 (A's unread excluded).
    expect(await portalUnreadTotal(B.accountId)).toBe(0);
  });

  it("sendPortalMessage refuses to post on A's request as B (no write)", async () => {
    const before = await prisma.clientMessage.count({ where: { workRequestId: A.requestId } });
    const res = await sendPortalMessage(B.accountId, A.requestId, { body: "injected", attachments: [] });
    expect(res).toBeNull();
    const after = await prisma.clientMessage.count({ where: { workRequestId: A.requestId } });
    expect(after).toBe(before);
  });

  it("markPortalThreadRead refuses to mutate read-state on A's thread as B", async () => {
    const res = await markPortalThreadRead(B.accountId, A.requestId);
    expect(res).toBe(0);
    // A's staff message is still unread.
    const stillUnread = await prisma.clientMessage.count({
      where: { workRequestId: A.requestId, senderType: "STAFF", readAt: null },
    });
    expect(stillUnread).toBeGreaterThan(0);
  });

  it("respondToPortalEstimate refuses accept/decline of A's estimate as B (no state change)", async () => {
    for (const decision of ["accept", "decline"] as const) {
      const res = await respondToPortalEstimate(B.accountId, aEstimateId, decision);
      expect(res.ok).toBe(false);
      expect(res.error).toBe("not_found");
    }
    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: aEstimateId } });
    expect(est.status).toBe("SENT");
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: A.requestId } });
    expect(wr.status).toBe("ESTIMATE_SENT");
    expect(await prisma.project.count({ where: { workRequestId: A.requestId } })).toBe(0);
  });
});

afterAll(async () => {
  for (const id of requestIds) {
    const wr = await prisma.workRequest.findUnique({
      where: { id },
      select: { customerId: true, addressId: true },
    });
    await prisma.clientMessageAttachment.deleteMany({ where: { message: { workRequestId: id } } });
    await prisma.clientMessage.deleteMany({ where: { workRequestId: id } });
    await prisma.projectMilestone.deleteMany({ where: { project: { workRequestId: id } } });
    await prisma.project.deleteMany({ where: { workRequestId: id } });
    await prisma.estimate.deleteMany({ where: { workRequestId: id } });
    await prisma.emailLog.deleteMany({ where: { relatedRequestId: id } });
    await prisma.notification.deleteMany({ where: { workRequestId: id } });
    await prisma.workRequestStatusHistory.deleteMany({ where: { workRequestId: id } });
    await prisma.workRequestActivity.deleteMany({ where: { workRequestId: id } });
    await prisma.workRequest.deleteMany({ where: { id } });
    if (wr) {
      await prisma.address.deleteMany({ where: { id: wr.addressId } });
      await prisma.customer.deleteMany({ where: { id: wr.customerId } });
    }
  }
  for (const id of accountIds) {
    await prisma.customerAccount.deleteMany({ where: { id } });
  }
});
