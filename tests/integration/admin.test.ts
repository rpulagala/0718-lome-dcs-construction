import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  inviteUser,
  updateUser,
  setUserActive,
  resendInvite,
} from "@/lib/services/userAdmin";
import {
  createCategory,
  updateCategory,
  setCategoryActive,
  reorderCategory,
  deleteCategory,
} from "@/lib/services/categoryAdmin";
import { updateSetting, getSetting } from "@/lib/services/settings";

let adminId = "";
const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const tag = crypto.randomUUID().slice(0, 8);

beforeAll(async () => {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL_ADMIN" } });
  adminId = admin.id;
});

describe("user administration", () => {
  it("invites a user, hashes a password, and logs an audit + email", async () => {
    const email = `invitee+${tag}@example.com`;
    const res = await inviteUser(adminId, { name: "Invited Person", email, role: "EMPLOYEE", phone: "" });
    expect(res.ok).toBe(true);
    createdUserIds.push(res.id!);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: res.id! } });
    expect(user.email).toBe(email);
    expect(user.passwordHash.length).toBeGreaterThan(20);
    expect(user.isActive).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "user.create", entityId: res.id! },
    });
    expect(audit).not.toBeNull();

    const emailLog = await prisma.emailLog.findFirst({
      where: { recipient: email, template: "user_invite" },
    });
    expect(emailLog).not.toBeNull();
  });

  it("rejects a duplicate email", async () => {
    const email = `dup+${tag}@example.com`;
    const first = await inviteUser(adminId, { name: "First", email, role: "EMPLOYEE" });
    expect(first.ok).toBe(true);
    createdUserIds.push(first.id!);
    const second = await inviteUser(adminId, { name: "Second", email, role: "EMPLOYEE" });
    expect(second.ok).toBe(false);
  });

  it("updates a role and records a role_change audit", async () => {
    const id = createdUserIds[0];
    const res = await updateUser(adminId, id, { name: "Invited Person", role: "MANAGER", phone: "415-555-0000" });
    expect(res.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user.role).toBe("MANAGER");
    const audit = await prisma.auditLog.findFirst({
      where: { action: "user.role_change", entityId: id },
    });
    expect(audit).not.toBeNull();
  });

  it("deactivates and reactivates a user", async () => {
    const id = createdUserIds[0];
    expect((await setUserActive(adminId, id, false)).ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
    expect((await setUserActive(adminId, id, true)).ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).isActive).toBe(true);
  });

  it("blocks deactivating your own account", async () => {
    const res = await setUserActive(adminId, adminId, false);
    expect(res.ok).toBe(false);
  });

  it("blocks demoting/deactivating the last active principal admin", async () => {
    // Make a throwaway admin, then deactivate the seed admins so it's the last one.
    const lone = await inviteUser(adminId, {
      name: "Lone Admin",
      email: `lone+${tag}@example.com`,
      role: "PRINCIPAL_ADMIN",
    });
    createdUserIds.push(lone.id!);

    const otherAdmins = await prisma.user.findMany({
      where: { role: "PRINCIPAL_ADMIN", isActive: true, id: { notIn: [lone.id!] } },
      select: { id: true },
    });
    const reactivate: string[] = [];
    for (const a of otherAdmins) {
      await prisma.user.update({ where: { id: a.id }, data: { isActive: false } });
      reactivate.push(a.id);
    }

    // Now `lone` is the only active admin — both guards must fire.
    const demote = await updateUser(lone.id!, lone.id!, { name: "Lone Admin", role: "EMPLOYEE", phone: "" });
    expect(demote.ok).toBe(false);
    const deactivate = await setUserActive(adminId, lone.id!, false);
    expect(deactivate.ok).toBe(false);

    // Restore seed admins.
    for (const id of reactivate) {
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });

  it("resends an invite, rotating the password hash", async () => {
    const id = createdUserIds[0];
    const before = (await prisma.user.findUniqueOrThrow({ where: { id } })).passwordHash;
    const res = await resendInvite(adminId, id);
    expect(res.ok).toBe(true);
    const after = (await prisma.user.findUniqueOrThrow({ where: { id } })).passwordHash;
    expect(after).not.toBe(before);
    const audit = await prisma.auditLog.findFirst({ where: { action: "user.invite_resend", entityId: id } });
    expect(audit).not.toBeNull();
  });
});

describe("category administration", () => {
  it("creates a category appended to the ordering", async () => {
    const res = await createCategory(adminId, { name: `Cat A ${tag}`, description: "First" });
    expect(res.ok).toBe(true);
    createdCategoryIds.push(res.id!);
    const res2 = await createCategory(adminId, { name: `Cat B ${tag}`, description: "" });
    expect(res2.ok).toBe(true);
    createdCategoryIds.push(res2.id!);

    const a = await prisma.projectCategory.findUniqueOrThrow({ where: { id: res.id! } });
    const b = await prisma.projectCategory.findUniqueOrThrow({ where: { id: res2.id! } });
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder);
  });

  it("rejects a duplicate category name", async () => {
    const res = await createCategory(adminId, { name: `Cat A ${tag}`, description: "" });
    expect(res.ok).toBe(false);
  });

  it("renames a category", async () => {
    const id = createdCategoryIds[0];
    const res = await updateCategory(adminId, id, { name: `Cat A Renamed ${tag}`, description: "Updated" });
    expect(res.ok).toBe(true);
    const c = await prisma.projectCategory.findUniqueOrThrow({ where: { id } });
    expect(c.name).toBe(`Cat A Renamed ${tag}`);
  });

  it("swaps sort order when reordering down", async () => {
    const [aId, bId] = createdCategoryIds;
    const aBefore = (await prisma.projectCategory.findUniqueOrThrow({ where: { id: aId } })).sortOrder;
    const bBefore = (await prisma.projectCategory.findUniqueOrThrow({ where: { id: bId } })).sortOrder;
    const res = await reorderCategory(adminId, aId, "down");
    expect(res.ok).toBe(true);
    const aAfter = (await prisma.projectCategory.findUniqueOrThrow({ where: { id: aId } })).sortOrder;
    const bAfter = (await prisma.projectCategory.findUniqueOrThrow({ where: { id: bId } })).sortOrder;
    // A and its neighbor swapped positions.
    expect(aAfter).toBe(bBefore);
    expect(bAfter).toBe(aBefore);
  });

  it("deactivates and reactivates a category", async () => {
    const id = createdCategoryIds[1];
    expect((await setCategoryActive(adminId, id, false)).ok).toBe(true);
    expect((await prisma.projectCategory.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
    expect((await setCategoryActive(adminId, id, true)).ok).toBe(true);
  });

  it("blocks deleting a referenced category, allows deleting an unused one", async () => {
    // Reference the first category from a throwaway request.
    const referenced = createdCategoryIds[0];
    const customer = await prisma.customer.create({
      data: { fullName: "Cat Ref", email: `catref+${tag}@example.com`, phone: "415-555-0101" },
    });
    const address = await prisma.address.create({
      data: { street: "1 Cat St", city: "Sun City", state: "CA", zip: "94569", customerId: customer.id },
    });
    const wr = await prisma.workRequest.create({
      data: {
        requestNumber: `DCS-TEST-${tag}`,
        customerId: customer.id,
        addressId: address.id,
        categoryId: referenced,
        categoryNameSnapshot: "Cat A",
        description: "referencing request",
      },
    });

    const blocked = await deleteCategory(adminId, referenced);
    expect(blocked.ok).toBe(false);

    // The unused second category can be deleted.
    const unused = createdCategoryIds[1];
    const okDelete = await deleteCategory(adminId, unused);
    expect(okDelete.ok).toBe(true);
    createdCategoryIds.splice(createdCategoryIds.indexOf(unused), 1);

    // Cleanup the referencing request.
    await prisma.workRequestStatusHistory.deleteMany({ where: { workRequestId: wr.id } });
    await prisma.workRequestActivity.deleteMany({ where: { workRequestId: wr.id } });
    await prisma.workRequest.delete({ where: { id: wr.id } });
    await prisma.address.delete({ where: { id: address.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  });
});

describe("company settings", () => {
  it("validates and persists a setting, logging an audit entry", async () => {
    const res = await updateSetting(adminId, "upload_limits", { maxFiles: 7, maxMb: 6 });
    expect(res.ok).toBe(true);
    const value = (await getSetting("upload_limits")) as { maxFiles: number; maxMb: number };
    expect(value.maxFiles).toBe(7);
    expect(value.maxMb).toBe(6);
    const audit = await prisma.auditLog.findFirst({
      where: { action: "settings.update", entityId: "upload_limits" },
    });
    expect(audit).not.toBeNull();
  });

  it("rejects an invalid setting payload", async () => {
    const res = await updateSetting(adminId, "upload_limits", { maxFiles: 0, maxMb: 5 });
    expect(res.ok).toBe(false);
  });

  it("coerces workflow default hours from a string", async () => {
    const res = await updateSetting(adminId, "workflow_defaults", {
      defaultStatus: "NEW",
      defaultPriority: "HIGH",
      responseTargetHours: "24",
    });
    expect(res.ok).toBe(true);
    const value = (await getSetting("workflow_defaults")) as { responseTargetHours: number };
    expect(value.responseTargetHours).toBe(24);
  });
});

afterAll(async () => {
  // Restore seeded settings the tests mutated so the DB stays deterministic.
  await updateSetting(adminId, "upload_limits", { maxFiles: 10, maxMb: 10 });
  await updateSetting(adminId, "workflow_defaults", {
    defaultStatus: "NEW",
    defaultPriority: "NORMAL",
    responseTargetHours: 48,
  });

  await prisma.auditLog.deleteMany({ where: { entityId: { in: [...createdUserIds, ...createdCategoryIds] } } });
  await prisma.projectCategory.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});
