import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import { workRequestSchema } from "@/lib/validation/workRequest";

const createdRequestIds: string[] = [];

async function firstCategoryId(): Promise<string> {
  const c = await prisma.projectCategory.findFirstOrThrow({
    where: { isActive: true },
  });
  return c.id;
}

function buildInput(categoryId: string, idempotencyKey: string) {
  return workRequestSchema.parse({
    fullName: "Integration Tester",
    phone: "415-555-0199",
    email: `test+${idempotencyKey}@example.com`,
    street: "1 Test Street",
    city: "Sun City",
    state: "CA",
    zip: "94569",
    categoryId,
    description: "Automated integration test project description.",
    preferredContact: "EMAIL",
    permissionToContact: true,
    consentAccepted: true,
    idempotencyKey,
    photos: [
      {
        storageKey: "uploads/2026/integration-test.jpg",
        fileName: "integration-test.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        width: 800,
        height: 600,
      },
    ],
  });
}

describe("createWorkRequest (integration)", () => {
  it("persists request with photos, status history, activity, and email logs", async () => {
    const categoryId = await firstCategoryId();
    const input = buildInput(categoryId, crypto.randomUUID());

    const res = await createWorkRequest(input);
    createdRequestIds.push(res.id);

    expect(res.duplicate).toBe(false);
    expect(res.requestNumber).toMatch(/^DCS-\d{4}-\d{6}$/);

    const wr = await prisma.workRequest.findUniqueOrThrow({
      where: { id: res.id },
      include: { photos: true, statusHistory: true, activities: true },
    });

    expect(wr.status).toBe("NEW");
    expect(wr.categoryNameSnapshot.length).toBeGreaterThan(0);
    expect(wr.responseDueAt).not.toBeNull();
    expect(wr.photos).toHaveLength(1);
    expect(wr.statusHistory.some((s) => s.toStatus === "NEW")).toBe(true);
    expect(wr.activities.some((a) => a.type === "SUBMITTED")).toBe(true);

    const emails = await prisma.emailLog.findMany({
      where: { relatedRequestId: res.id },
    });
    expect(emails.some((e) => e.template === "customer_confirmation")).toBe(true);
    expect(emails.every((e) => e.status === "SENT")).toBe(true);
  });

  it("is idempotent: a repeated submission returns the original request", async () => {
    const categoryId = await firstCategoryId();
    const key = crypto.randomUUID();
    const input = buildInput(categoryId, key);

    const first = await createWorkRequest(input);
    createdRequestIds.push(first.id);
    const second = await createWorkRequest(input);

    expect(second.id).toBe(first.id);
    expect(second.duplicate).toBe(true);

    const count = await prisma.workRequest.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
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
  await prisma.$disconnect();
});
