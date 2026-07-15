import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";
import {
  sendPortalMessage,
  getPortalThread,
  markPortalThreadRead,
  portalUnreadTotal,
  listPortalThreads,
  sendStaffMessage,
  markThreadReadByStaff,
  staffUnreadCount,
} from "@/lib/services/messaging";

const requestIds: string[] = [];
const accountIds: string[] = [];

async function makeLinked(email: string): Promise<{ requestId: string; accountId: string }> {
  const category = await prisma.projectCategory.findFirstOrThrow({ where: { isActive: true } });
  const input = workRequestSchema.parse({
    fullName: "Msg Tester",
    phone: "415-555-0444",
    email,
    street: "5 Message Ln",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId: category.id,
    description: "Messaging isolation test request.",
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
    create: { email, name: "Msg Tester" },
  });
  accountIds.push(account.id);

  await prisma.workRequest.update({ where: { id: res.id }, data: { customerAccountId: account.id } });
  return { requestId: res.id, accountId: account.id };
}

const uniqueEmail = () => `portal-msg+${crypto.randomUUID().slice(0, 8)}@example.com`;

describe("client messaging — isolation", () => {
  it("sends and reads a customer message on an owned request", async () => {
    const a = await makeLinked(uniqueEmail());
    const sent = await sendPortalMessage(a.accountId, a.requestId, { body: "Hello team", attachments: [] });
    expect(sent).not.toBeNull();

    const thread = await getPortalThread(a.accountId, a.requestId);
    expect(thread?.messages).toHaveLength(1);
    expect(thread?.messages[0].body).toBe("Hello team");
    expect(thread?.messages[0].senderType).toBe("CUSTOMER");
  });

  it("refuses to send to another customer's request (no IDOR)", async () => {
    const a = await makeLinked(uniqueEmail());
    const b = await makeLinked(uniqueEmail());
    const leaked = await sendPortalMessage(b.accountId, a.requestId, { body: "sneaky", attachments: [] });
    expect(leaked).toBeNull();

    // And A's thread was not touched.
    const thread = await getPortalThread(a.accountId, a.requestId);
    expect(thread?.messages).toHaveLength(0);
  });

  it("refuses to read another customer's thread", async () => {
    const a = await makeLinked(uniqueEmail());
    const b = await makeLinked(uniqueEmail());
    await sendPortalMessage(a.accountId, a.requestId, { body: "private", attachments: [] });
    expect(await getPortalThread(b.accountId, a.requestId)).toBeNull();
  });

  it("stores photo attachments and returns them in the thread", async () => {
    const a = await makeLinked(uniqueEmail());
    await sendPortalMessage(a.accountId, a.requestId, {
      body: "photo of the issue",
      attachments: [
        {
          storageKey: "uploads/2026/test-attach.jpg",
          fileName: "issue.jpg",
          contentType: "image/jpeg",
          sizeBytes: 1234,
        },
      ],
    });
    const thread = await getPortalThread(a.accountId, a.requestId);
    expect(thread?.messages[0].attachments).toHaveLength(1);
    expect(thread?.messages[0].attachments[0].fileName).toBe("issue.jpg");
  });
});

describe("client messaging — read state", () => {
  it("tracks unread both ways and clears on read", async () => {
    const a = await makeLinked(uniqueEmail());
    const user = await prisma.user.findFirstOrThrow();

    // Customer → staff: one unread for staff.
    await sendPortalMessage(a.accountId, a.requestId, { body: "hi", attachments: [] });
    expect(await staffUnreadCount(a.requestId)).toBe(1);
    expect(await markThreadReadByStaff(a.requestId)).toBe(1);
    expect(await staffUnreadCount(a.requestId)).toBe(0);

    // Staff → customer: one unread for the customer.
    await sendStaffMessage(user.id, a.requestId, { body: "hello back" });
    expect(await portalUnreadTotal(a.accountId)).toBe(1);
    expect(await markPortalThreadRead(a.accountId, a.requestId)).toBe(1);
    expect(await portalUnreadTotal(a.accountId)).toBe(0);
  });

  it("markPortalThreadRead refuses a non-owned request", async () => {
    const a = await makeLinked(uniqueEmail());
    const b = await makeLinked(uniqueEmail());
    const user = await prisma.user.findFirstOrThrow();
    await sendStaffMessage(user.id, a.requestId, { body: "for A only" });

    // B attempts to mark A's thread read — no effect.
    expect(await markPortalThreadRead(b.accountId, a.requestId)).toBe(0);
    expect(await portalUnreadTotal(a.accountId)).toBe(1);
  });

  it("lists threads with last message and unread count", async () => {
    const a = await makeLinked(uniqueEmail());
    const user = await prisma.user.findFirstOrThrow();
    await sendStaffMessage(user.id, a.requestId, { body: "latest" });

    const rows = await listPortalThreads(a.accountId);
    const row = rows.find((r) => r.requestId === a.requestId);
    expect(row?.lastBody).toBe("latest");
    expect(row?.lastSender).toBe("STAFF");
    expect(row?.unread).toBe(1);
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
