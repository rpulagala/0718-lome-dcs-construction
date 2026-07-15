import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";
import { respondToPortalEstimate } from "@/lib/services/portalEstimates";

const requestIds: string[] = [];
const accountIds: string[] = [];

function uniqueEmail(): string {
  return `portal-est+${crypto.randomUUID().slice(0, 8)}@example.com`;
}

/** A linked request (status ESTIMATE_SENT) plus a SENT estimate ready to answer. */
async function makeLinkedWithSentEstimate(opts?: {
  amount?: string;
  expiresAt?: Date | null;
}): Promise<{ requestId: string; accountId: string; estimateId: string; categoryName: string }> {
  const email = uniqueEmail();
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const input = workRequestSchema.parse({
    fullName: "Estimate Portal Tester",
    phone: "415-555-0231",
    email,
    street: "9 Estimate Loop",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Portal estimate accept/decline test request.",
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
    create: { email, name: "Estimate Portal Tester" },
  });
  accountIds.push(account.id);

  await prisma.workRequest.update({
    where: { id: res.id },
    data: { customerAccountId: account.id, status: "ESTIMATE_SENT" },
  });

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: `EST-TEST-${crypto.randomUUID().slice(0, 8)}`,
      workRequestId: res.id,
      status: "SENT",
      amount: opts?.amount ?? "12500.00",
      customerNotes: "Includes cleanup.",
      sentAt: new Date(),
      expiresAt: opts?.expiresAt ?? null,
    },
  });

  return { requestId: res.id, accountId: account.id, estimateId: estimate.id, categoryName: category.name };
}

describe("portal estimate accept/decline", () => {
  it("accepts a sent estimate: flips to ACCEPTED, creates a project, advances the request", async () => {
    const a = await makeLinkedWithSentEstimate({ amount: "12500.00" });

    const res = await respondToPortalEstimate(a.accountId, a.estimateId, "accept");
    expect(res.ok).toBe(true);
    expect(res.projectId).toBeTruthy();

    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: a.estimateId } });
    expect(est.status).toBe("ACCEPTED");

    const project = await prisma.project.findUniqueOrThrow({ where: { id: res.projectId! } });
    expect(project.workRequestId).toBe(a.requestId);
    expect(project.name).toBe(a.categoryName); // default name = request category
    expect(project.contractAmount?.toString()).toBe("12500"); // defaults from the estimate

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: a.requestId } });
    expect(wr.status).toBe("PROJECT_SCHEDULED");

    // A customer-visible activity is logged so it surfaces in the app + console.
    const activity = await prisma.workRequestActivity.findFirst({
      where: { workRequestId: a.requestId, summary: { contains: "accepted estimate" }, isCustomerVisible: true },
    });
    expect(activity).not.toBeNull();
  });

  it("declines a sent estimate: flips to DECLINED and advances the request", async () => {
    const a = await makeLinkedWithSentEstimate();

    const res = await respondToPortalEstimate(a.accountId, a.estimateId, "decline");
    expect(res.ok).toBe(true);

    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: a.estimateId } });
    expect(est.status).toBe("DECLINED");

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: a.requestId } });
    expect(wr.status).toBe("DECLINED");

    expect(await prisma.project.count({ where: { workRequestId: a.requestId } })).toBe(0);
  });

  it("refuses to answer another account's estimate (no IDOR), leaving it untouched", async () => {
    const a = await makeLinkedWithSentEstimate();
    const b = await makeLinkedWithSentEstimate();

    const leaked = await respondToPortalEstimate(b.accountId, a.estimateId, "accept");
    expect(leaked.ok).toBe(false);
    expect(leaked.error).toBe("not_found");

    // A's estimate + request are unchanged.
    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: a.estimateId } });
    expect(est.status).toBe("SENT");
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: a.requestId } });
    expect(wr.status).toBe("ESTIMATE_SENT");
    expect(await prisma.project.count({ where: { workRequestId: a.requestId } })).toBe(0);
  });

  it("cannot answer a non-SENT estimate (e.g. after it was already accepted)", async () => {
    const a = await makeLinkedWithSentEstimate();

    const first = await respondToPortalEstimate(a.accountId, a.estimateId, "accept");
    expect(first.ok).toBe(true);

    // Second attempt: the estimate is now ACCEPTED, not awaiting a decision.
    const second = await respondToPortalEstimate(a.accountId, a.estimateId, "accept");
    expect(second.ok).toBe(false);
  });

  it("cannot accept an expired estimate", async () => {
    const a = await makeLinkedWithSentEstimate({ expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });

    const res = await respondToPortalEstimate(a.accountId, a.estimateId, "accept");
    expect(res.ok).toBe(false);

    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: a.estimateId } });
    expect(est.status).toBe("SENT");
  });

  it("blocks acceptance when the request already has a project", async () => {
    const a = await makeLinkedWithSentEstimate();
    const accept = await respondToPortalEstimate(a.accountId, a.estimateId, "accept");
    expect(accept.ok).toBe(true);

    // A second SENT estimate against the same (now project-bearing) request.
    const second = await prisma.estimate.create({
      data: {
        estimateNumber: `EST-TEST-${crypto.randomUUID().slice(0, 8)}`,
        workRequestId: a.requestId,
        status: "SENT",
        amount: "1000",
        sentAt: new Date(),
      },
    });

    const res = await respondToPortalEstimate(a.accountId, second.id, "accept");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("already has a project");
  });
});

afterAll(async () => {
  for (const id of requestIds) {
    const wr = await prisma.workRequest.findUnique({
      where: { id },
      select: { customerId: true, addressId: true },
    });
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
