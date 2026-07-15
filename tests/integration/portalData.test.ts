import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";
import {
  listPortalRequests,
  getPortalRequestDetail,
  isCompletedStatus,
} from "@/lib/services/portalData";
import type { RequestStatus } from "@/lib/generated/prisma/enums";

const requestIds: string[] = [];
const accountIds: string[] = [];

/** Create a work request and a CustomerAccount, linked. Returns both ids. */
async function makeLinked(email: string): Promise<{ requestId: string; accountId: string }> {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const input = workRequestSchema.parse({
    fullName: "Isolation Tester",
    phone: "415-555-0222",
    email,
    street: "12 Isolation Way",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Portal data isolation test request.",
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
    create: { email, name: "Isolation Tester" },
  });
  accountIds.push(account.id);

  await prisma.workRequest.update({
    where: { id: res.id },
    data: { customerAccountId: account.id },
  });

  return { requestId: res.id, accountId: account.id };
}

function uniqueEmail(): string {
  return `portal-data+${crypto.randomUUID().slice(0, 8)}@example.com`;
}

describe("portal data isolation", () => {
  it("listPortalRequests returns only the account's own requests", async () => {
    const a = await makeLinked(uniqueEmail());
    const b = await makeLinked(uniqueEmail());

    const listA = await listPortalRequests(a.accountId);
    const idsA = [...listA.active, ...listA.completed].map((r) => r.id);

    expect(idsA).toContain(a.requestId);
    expect(idsA).not.toContain(b.requestId);
  });

  it("getPortalRequestDetail returns the request for its owner", async () => {
    const a = await makeLinked(uniqueEmail());
    const detail = await getPortalRequestDetail(a.accountId, a.requestId);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(a.requestId);
  });

  it("getPortalRequestDetail refuses another account's request (no IDOR)", async () => {
    const a = await makeLinked(uniqueEmail());
    const b = await makeLinked(uniqueEmail());

    // B tries to read A's request by id.
    const leaked = await getPortalRequestDetail(b.accountId, a.requestId);
    expect(leaked).toBeNull();
  });

  it("buckets requests into active vs completed by status", async () => {
    const a = await makeLinked(uniqueEmail());
    await prisma.workRequest.update({
      where: { id: a.requestId },
      data: { status: "COMPLETED" },
    });

    const list = await listPortalRequests(a.accountId);
    expect(list.completed.map((r) => r.id)).toContain(a.requestId);
    expect(list.active.map((r) => r.id)).not.toContain(a.requestId);
  });

  it("isCompletedStatus classifies terminal statuses", () => {
    const completed: RequestStatus[] = ["COMPLETED", "DECLINED", "CANCELLED", "ARCHIVED"];
    const active: RequestStatus[] = ["NEW", "IN_PROGRESS", "ESTIMATE_SENT"];
    for (const s of completed) expect(isCompletedStatus(s)).toBe(true);
    for (const s of active) expect(isCompletedStatus(s)).toBe(false);
  });
});

describe("portal data shaping (least-data)", () => {
  it("exposes only customer-visible notes", async () => {
    const a = await makeLinked(uniqueEmail());
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("expected a seeded user for note authorship");

    await prisma.workRequestNote.create({
      data: {
        workRequestId: a.requestId,
        authorId: user.id,
        body: "CUSTOMER note — visible in the app",
        visibility: "CUSTOMER_VISIBLE",
      },
    });
    await prisma.workRequestNote.create({
      data: {
        workRequestId: a.requestId,
        authorId: user.id,
        body: "INTERNAL note — must never leak",
        visibility: "INTERNAL",
      },
    });

    const detail = await getPortalRequestDetail(a.accountId, a.requestId);
    const bodies = detail!.notes.map((n) => n.body);
    expect(bodies).toContain("CUSTOMER note — visible in the app");
    expect(bodies.join("\n")).not.toContain("INTERNAL note");
  });

  it("exposes only estimates that were sent to the customer", async () => {
    const a = await makeLinked(uniqueEmail());

    await prisma.estimate.create({
      data: {
        estimateNumber: `EST-TEST-${crypto.randomUUID().slice(0, 8)}`,
        workRequestId: a.requestId,
        status: "SENT",
        amount: "5000",
        customerNotes: "Sent estimate the customer can see",
        sentAt: new Date(),
      },
    });
    await prisma.estimate.create({
      data: {
        estimateNumber: `EST-DRAFT-${crypto.randomUUID().slice(0, 8)}`,
        workRequestId: a.requestId,
        status: "DRAFT",
        amount: "9999",
        internalNotes: "Draft — not yet sent",
      },
    });

    const detail = await getPortalRequestDetail(a.accountId, a.requestId);
    expect(detail!.estimates).toHaveLength(1);
    expect(detail!.estimates[0].amountLabel).toContain("5,000");
  });
});

afterAll(async () => {
  for (const id of requestIds) {
    const wr = await prisma.workRequest.findUnique({
      where: { id },
      select: { customerId: true, addressId: true },
    });
    await prisma.estimate.deleteMany({ where: { workRequestId: id } });
    await prisma.workRequestNote.deleteMany({ where: { workRequestId: id } });
    await prisma.emailLog.deleteMany({ where: { relatedRequestId: id } });
    await prisma.notification.deleteMany({ where: { workRequestId: id } });
    await prisma.workRequestPhoto.deleteMany({ where: { workRequestId: id } });
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
