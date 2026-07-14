"use server";

import { revalidatePath } from "next/cache";
import { requireCan } from "@/lib/auth/session";
import {
  changeStatus,
  assignRequest,
  setPriority,
  addNote,
} from "@/lib/services/requestMutations";
import {
  scheduleSiteVisit,
  rescheduleSiteVisit,
  cancelSiteVisit,
  completeSiteVisit,
} from "@/lib/services/scheduling";
import { logCommunication, createTask, toggleTask } from "@/lib/services/communication";
import { siteVisitSchema, communicationSchema, taskSchema } from "@/lib/validation/siteVisit";
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

export async function scheduleVisitAction(requestId: string, form: unknown) {
  const user = await requireCan("request:schedule");
  const parsed = siteVisitSchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const res = await scheduleSiteVisit(user.id, requestId, parsed.data);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function rescheduleVisitAction(
  requestId: string,
  siteVisitId: string,
  form: unknown,
) {
  const user = await requireCan("request:schedule");
  const parsed = siteVisitSchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const res = await rescheduleSiteVisit(user.id, siteVisitId, parsed.data);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function cancelVisitAction(
  requestId: string,
  siteVisitId: string,
  reason: string,
) {
  const user = await requireCan("request:schedule");
  const res = await cancelSiteVisit(user.id, siteVisitId, reason);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function completeVisitAction(requestId: string, siteVisitId: string) {
  const user = await requireCan("request:schedule");
  const res = await completeSiteVisit(user.id, siteVisitId);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function logCommunicationAction(requestId: string, form: unknown) {
  const user = await requireCan("request:note");
  const parsed = communicationSchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const res = await logCommunication(user.id, requestId, parsed.data);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function createTaskAction(requestId: string, form: unknown) {
  const user = await requireCan("request:note");
  const parsed = taskSchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const res = await createTask(user.id, requestId, parsed.data);
  revalidatePath(`/requests/${requestId}`);
  return res;
}

export async function toggleTaskAction(
  requestId: string,
  taskId: string,
  complete: boolean,
) {
  const user = await requireCan("request:note");
  const res = await toggleTask(user.id, taskId, complete);
  revalidatePath(`/requests/${requestId}`);
  return res;
}
