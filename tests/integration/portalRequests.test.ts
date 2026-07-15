import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { portalRequestSchema } from "@/lib/validation/workRequest";
import { createPortalRequest } from "@/lib/services/portalRequests";
import { listPortalRequests } from "@/lib/services/portalData";

const requestIds: string[] = [];
const accountIds: string[] = [];

async function makeAccount(email: string): Promise<string> {
  const account = await prisma.customerAccount.upsert({
    where: { email },
    update: {},
    create: { email, name: "New Request Tester", phone: "415-555-0333" },
  });
  accountIds.push(account.id);
  return account.id;
}

function validInput(overrides: Record<string, unknown> = {}) {
  return portalRequestSchema.parse({
    fullName: "New Request Tester",
    phone: "415-555-0333",
    street: "88 Builder St",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: "", // set by caller
    description: "Please remodel the primary bathroom with new tile and vanity.",
    preferredContact: "EMAIL",
    idempotencyKey: crypto.randomUUID(),
    photos: [],
    ...overrides,
  });
}

function uniqueEmail(): string {
  return `portal-new+${crypto.randomUUID().slice(0, 8)}@example.com`;
}

describe("createPortalRequest", () => {
  it("creates a request linked to the account and visible to it", async () => {
    const email = uniqueEmail();
    const accountId = await makeAccount(email);
    const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });

    const res = await createPortalRequest(accountId, validInput({ categoryId: category.id }));
    requestIds.push(res.id);

    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: res.id } });
    expect(wr.customerAccountId).toBe(accountId);
    expect(wr.referralSource).toBe("Customer app");

    const list = await listPortalRequests(accountId);
    expect(list.active.map((r) => r.id)).toContain(res.id);
  });

  it("uses the account's canonical email, ignoring anything client-supplied", async () => {
    const email = uniqueEmail();
    const accountId = await makeAccount(email);
    const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });

    // The portal schema doesn't even accept an email field, but confirm the
    // created customer row carries the account email (linking stays consistent).
    const res = await createPortalRequest(accountId, validInput({ categoryId: category.id }));
    requestIds.push(res.id);

    const wr = await prisma.workRequest.findUniqueOrThrow({
      where: { id: res.id },
      include: { customer: true },
    });
    expect(wr.customer.email).toBe(email);
  });
});

afterAll(async () => {
  for (const id of requestIds) {
    const wr = await prisma.workRequest.findUnique({
      where: { id },
      select: { customerId: true, addressId: true },
    });
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
