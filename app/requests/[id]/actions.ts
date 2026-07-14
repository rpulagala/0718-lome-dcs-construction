"use server";

import { revalidatePath } from "next/cache";
import { requireCan } from "@/lib/auth/session";
import {
  changeStatus,
  assignRequest,
  setPriority,
  addNote,
} from "@/lib/services/requestMutations";
import type {
  RequestStatus,
  Priority,
  NoteVisibility,
} from "@/lib/generated/prisma/enums";

export async function changeStatusAction(
  requestId: string,
  toStatus: string,
  reason: string,
) {
  const user = await requireCan("request:status");
  const res = await changeStatus(user.id, requestId, toStatus as RequestStatus, reason);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function assignAction(requestId: string, assigneeId: string) {
  const user = await requireCan("request:assign");
  const res = await assignRequest(user.id, requestId, assigneeId || null);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function priorityAction(requestId: string, priority: string) {
  const user = await requireCan("request:status");
  const res = await setPriority(user.id, requestId, priority as Priority);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function addNoteAction(
  requestId: string,
  body: string,
  visibility: string,
) {
  const user = await requireCan("request:note");
  const res = await addNote(user.id, requestId, body, visibility as NoteVisibility);
  revalidatePath(`/requests/${requestId}`);
  return res;
}
