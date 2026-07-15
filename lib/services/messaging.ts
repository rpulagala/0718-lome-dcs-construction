import { prisma } from "@/lib/db";
import { portalPhotoSrc } from "@/lib/portal/photoSrc";
import type { PortalMessageInput, StaffMessageInput } from "@/lib/validation/message";
import type { MessageSenderType } from "@/lib/generated/prisma/enums";

/**
 * Client messaging — a two-way thread per work request between a customer and
 * DCS staff. As with the rest of the portal, EVERY customer-facing call is
 * scoped to the signed-in `customerAccountId`: ownership is re-checked before
 * any read, write, or read-state mutation, so a customer can never touch another
 * customer's thread (see §7 of docs/CLIENT_APP_PLAN.md). Staff-facing calls
 * assume the caller is already authorized via `requireCan` at the action layer.
 */

export interface ThreadMessage {
  id: string;
  senderType: MessageSenderType;
  authorName: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  attachments: { id: string; fileName: string; src: string }[];
}

export interface PortalThread {
  requestId: string;
  requestNumber: string;
  title: string;
  messages: ThreadMessage[];
}

export interface PortalThreadRow {
  requestId: string;
  requestNumber: string;
  title: string;
  lastBody: string | null;
  lastSender: MessageSenderType | null;
  lastAt: Date | null;
  unread: number;
}

function staffFileSrc(storageKey: string): string {
  return /^https?:\/\//i.test(storageKey) ? storageKey : `/api/files/${storageKey}`;
}

/** Confirm a request is owned by the account; returns its id or null. */
async function ownedRequestId(accountId: string, requestId: string): Promise<string | null> {
  const owned = await prisma.workRequest.findFirst({
    where: { id: requestId, customerAccountId: accountId },
    select: { id: true },
  });
  return owned?.id ?? null;
}

// ---------- Customer (portal) side ----------

/** One row per request the account owns, with its latest message + unread count. */
export async function listPortalThreads(accountId: string): Promise<PortalThreadRow[]> {
  const [requests, unread] = await Promise.all([
    prisma.workRequest.findMany({
      where: { customerAccountId: accountId },
      select: {
        id: true,
        requestNumber: true,
        categoryNameSnapshot: true,
        updatedAt: true,
        clientMessages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { body: true, senderType: true, createdAt: true },
        },
      },
    }),
    prisma.clientMessage.groupBy({
      by: ["workRequestId"],
      where: { workRequest: { customerAccountId: accountId }, senderType: "STAFF", readAt: null },
      _count: { _all: true },
    }),
  ]);

  const unreadByRequest = new Map(unread.map((u) => [u.workRequestId, u._count._all]));

  return requests
    .map((r) => {
      const last = r.clientMessages[0] ?? null;
      return {
        requestId: r.id,
        requestNumber: r.requestNumber,
        title: r.categoryNameSnapshot,
        lastBody: last?.body ?? null,
        lastSender: last?.senderType ?? null,
        lastAt: last?.createdAt ?? null,
        unread: unreadByRequest.get(r.id) ?? 0,
      };
    })
    .sort((a, b) => {
      const at = a.lastAt?.getTime() ?? 0;
      const bt = b.lastAt?.getTime() ?? 0;
      return bt - at;
    });
}

/** Total unread (staff→customer) messages across the account. */
export function portalUnreadTotal(accountId: string): Promise<number> {
  return prisma.clientMessage.count({
    where: { senderType: "STAFF", readAt: null, workRequest: { customerAccountId: accountId } },
  });
}

/** The full thread for an owned request, or null if the account doesn't own it. */
export async function getPortalThread(
  accountId: string,
  requestId: string,
): Promise<PortalThread | null> {
  const owned = await prisma.workRequest.findFirst({
    where: { id: requestId, customerAccountId: accountId },
    select: { id: true, requestNumber: true, categoryNameSnapshot: true },
  });
  if (!owned) return null;

  const messages = await prisma.clientMessage.findMany({
    where: { workRequestId: requestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderType: true,
      body: true,
      createdAt: true,
      readAt: true,
      authorUser: { select: { name: true } },
      authorAccount: { select: { name: true } },
      attachments: { select: { id: true, fileName: true, storageKey: true } },
    },
  });

  return {
    requestId: owned.id,
    requestNumber: owned.requestNumber,
    title: owned.categoryNameSnapshot,
    messages: messages.map((m) => ({
      id: m.id,
      senderType: m.senderType,
      authorName:
        m.senderType === "STAFF"
          ? m.authorUser?.name ?? "DCS Construction"
          : m.authorAccount?.name ?? "You",
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        src: portalPhotoSrc(a.storageKey),
      })),
    })),
  };
}

/** Mark staff→customer messages on an owned request as read. Returns the count. */
export async function markPortalThreadRead(accountId: string, requestId: string): Promise<number> {
  if (!(await ownedRequestId(accountId, requestId))) return 0;
  const res = await prisma.clientMessage.updateMany({
    where: { workRequestId: requestId, senderType: "STAFF", readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

/** Send a customer message on an owned request. Returns null if not owned. */
export async function sendPortalMessage(
  accountId: string,
  requestId: string,
  input: PortalMessageInput,
): Promise<{ id: string } | null> {
  if (!(await ownedRequestId(accountId, requestId))) return null;
  const msg = await prisma.clientMessage.create({
    data: {
      workRequestId: requestId,
      senderType: "CUSTOMER",
      authorAccountId: accountId,
      body: input.body,
      attachments: {
        create: input.attachments.map((a) => ({
          storageKey: a.storageKey,
          fileName: a.fileName,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes,
        })),
      },
    },
    select: { id: true },
  });
  return { id: msg.id };
}

// ---------- Staff (console) side ----------

/** Full thread for the staff console (caller must already be authorized). */
export async function getStaffThread(requestId: string): Promise<ThreadMessage[]> {
  const messages = await prisma.clientMessage.findMany({
    where: { workRequestId: requestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderType: true,
      body: true,
      createdAt: true,
      readAt: true,
      authorUser: { select: { name: true } },
      authorAccount: { select: { name: true } },
      attachments: { select: { id: true, fileName: true, storageKey: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    senderType: m.senderType,
    authorName:
      m.senderType === "STAFF"
        ? m.authorUser?.name ?? "DCS staff"
        : m.authorAccount?.name ?? "Customer",
    body: m.body,
    createdAt: m.createdAt,
    readAt: m.readAt,
    attachments: m.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      src: staffFileSrc(a.storageKey),
    })),
  }));
}

/** Post a staff reply on a request thread. */
export async function sendStaffMessage(
  userId: string,
  requestId: string,
  input: StaffMessageInput,
): Promise<{ id: string }> {
  const msg = await prisma.clientMessage.create({
    data: {
      workRequestId: requestId,
      senderType: "STAFF",
      authorUserId: userId,
      body: input.body,
    },
    select: { id: true },
  });
  return { id: msg.id };
}

/** Mark customer→staff messages on a request as read. Returns the count. */
export async function markThreadReadByStaff(requestId: string): Promise<number> {
  const res = await prisma.clientMessage.updateMany({
    where: { workRequestId: requestId, senderType: "CUSTOMER", readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

/** Count of unread customer→staff messages on a request (for a console badge). */
export function staffUnreadCount(requestId: string): Promise<number> {
  return prisma.clientMessage.count({
    where: { workRequestId: requestId, senderType: "CUSTOMER", readAt: null },
  });
}
