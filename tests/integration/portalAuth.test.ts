import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";
import { requestLoginCode, verifyLoginCode } from "@/lib/services/portalAuth";

const createdRequestIds: string[] = [];
const usedEmails: string[] = [];

function hashCode(code: string, email: string): string {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET || "dev-portal-secret-change-me")
    .update(`${code}:${email}`)
    .digest("hex");
}

async function seedCode(email: string, code: string, opts: { expired?: boolean } = {}) {
  return prisma.customerLoginCode.create({
    data: {
      email,
      codeHash: hashCode(code, email),
      expiresAt: new Date(Date.now() + (opts.expired ? -1000 : 10 * 60 * 1000)),
    },
  });
}

async function makeRequestFor(email: string): Promise<string> {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const input = workRequestSchema.parse({
    fullName: "Portal Tester",
    phone: "415-555-0111",
    email,
    street: "9 Portal Ave",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Portal linking integration test request.",
    preferredContact: "EMAIL",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey: crypto.randomUUID(),
    photos: [],
  });
  const res = await createWorkRequest(input);
  createdRequestIds.push(res.id);
  return res.id;
}

describe("portal passwordless auth", () => {
  it("requestLoginCode stores a hashed code for a valid email", async () => {
    const email = `portal+${crypto.randomUUID().slice(0, 8)}@example.com`;
    usedEmails.push(email);
    const before = await prisma.customerLoginCode.count({ where: { email } });
    const res = await requestLoginCode(email);
    expect(res.ok).toBe(true);
    const after = await prisma.customerLoginCode.count({ where: { email } });
    expect(after).toBe(before + 1);
    const rec = await prisma.customerLoginCode.findFirstOrThrow({ where: { email } });
    expect(rec.codeHash).not.toContain("000000");
    expect(rec.consumedAt).toBeNull();
  });

  it("rejects an invalid email shape", async () => {
    expect((await requestLoginCode("not-an-email")).ok).toBe(false);
  });

  it("verifies a correct code, creates the account, and links existing requests", async () => {
    const email = `portal+${crypto.randomUUID().slice(0, 8)}@example.com`;
    usedEmails.push(email);
    const requestId = await makeRequestFor(email);
    await seedCode(email, "123456");

    const res = await verifyLoginCode(email, "123456");
    expect(res.ok).toBe(true);
    expect(res.account?.email).toBe(email);

    const account = await prisma.customerAccount.findUniqueOrThrow({ where: { email } });
    const wr = await prisma.workRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(wr.customerAccountId).toBe(account.id);
    expect(account.name).toBe("Portal Tester");

    // Code is now consumed → a second use fails.
    const reuse = await verifyLoginCode(email, "123456");
    expect(reuse.ok).toBe(false);
  });

  it("rejects a wrong code and increments attempts", async () => {
    const email = `portal+${crypto.randomUUID().slice(0, 8)}@example.com`;
    usedEmails.push(email);
    const rec = await seedCode(email, "654321");

    const res = await verifyLoginCode(email, "000000");
    expect(res.ok).toBe(false);
    const after = await prisma.customerLoginCode.findUniqueOrThrow({ where: { id: rec.id } });
    expect(after.attempts).toBe(1);
    expect(after.consumedAt).toBeNull();
  });

  it("rejects an expired code", async () => {
    const email = `portal+${crypto.randomUUID().slice(0, 8)}@example.com`;
    usedEmails.push(email);
    await seedCode(email, "111111", { expired: true });
    const res = await verifyLoginCode(email, "111111");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/expired/i);
  });
});

afterAll(async () => {
  for (const id of createdRequestIds) {
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
  for (const email of usedEmails) {
    await prisma.customerLoginCode.deleteMany({ where: { email } });
    await prisma.customerAccount.deleteMany({ where: { email } });
    await prisma.customer.deleteMany({ where: { email } });
  }
});
