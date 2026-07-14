import { prisma } from "@/lib/db";
import { combineDateTime } from "@/lib/domain/scheduling";
import {
  communicationSchema,
  taskSchema,
  type CommunicationInput,
  type TaskInput,
} from "@/lib/validation/siteVisit";

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Record a communication (call, email, text, etc.) against a request. */
export async function logCommunication(
  actorId: string,
  requestId: string,
  input: CommunicationInput,
): Promise<MutationResult> {
  const parsed = communicationSchema.parse(input);
  const occurredAt = parsed.occurredAt ? combineDateTime(parsed.occurredAt, null) : new Date();
  if (!occurredAt) return { ok: false, error: "Invalid date" };

  const wr = await prisma.workRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!wr) return { ok: false, error: "Request not found" };

  const comm = await prisma.$transaction(async (tx) => {
    const c = await tx.communication.create({
      data: {
        workRequestId: requestId,
        loggedById: actorId,
        channel: parsed.channel,
        direction: parsed.direction,
        summary: parsed.summary,
        occurredAt,
      },
    });
    await tx.workRequestActivity.create({
      data: {
        workRequestId: requestId,
        type: "COMMUNICATION_LOGGED",
        summary: `${parsed.direction === "INBOUND" ? "Inbound" : "Outbound"} ${parsed.channel.toLowerCase()} logged`,
      },
    });
    return c;
  });

  return { ok: true, id: comm.id };
}

/** Create a follow-up task on a request. */
export async function createTask(
  actorId: string,
  requestId: string,
  input: TaskInput,
): Promise<MutationResult> {
  const parsed = taskSchema.parse(input);
  const dueAt = parsed.dueAt ? combineDateTime(parsed.dueAt, null) : null;
  if (parsed.dueAt && !dueAt) return { ok: false, error: "Invalid due date" };

  const wr = await prisma.workRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!wr) return { ok: false, error: "Request not found" };

  const task = await prisma.task.create({
    data: {
      workRequestId: requestId,
      title: parsed.title,
      dueAt,
      assigneeId: parsed.assigneeId || null,
      createdById: actorId,
    },
  });
  return { ok: true, id: task.id };
}

/** Toggle a task's completion state. */
export async function toggleTask(
  actorId: string,
  taskId: string,
  complete: boolean,
): Promise<MutationResult> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return { ok: false, error: "Task not found" };
  await prisma.task.update({
    where: { id: taskId },
    data: { isComplete: complete, completedAt: complete ? new Date() : null },
  });
  return { ok: true, id: taskId };
}
