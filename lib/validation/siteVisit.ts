import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A valid date is required");

const timeStr = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/, "Time must be HH:MM")
  .optional()
  .or(z.literal(""));

/** Schedule (or reschedule) a site visit. Times are optional HH:MM strings. */
export const siteVisitSchema = z.object({
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr,
  assignedToId: z.string().optional().or(z.literal("")),
  addressId: z.string().optional().or(z.literal("")),
  confirmed: z.boolean().default(false),
  notifyCustomer: z.boolean().default(true),
  customerInstructions: optionalText(1000),
  internalInstructions: optionalText(1000),
});

export type SiteVisitInput = z.infer<typeof siteVisitSchema>;

/** Log a communication with the customer or another party. */
export const communicationSchema = z.object({
  channel: z.enum(["PHONE", "EMAIL", "TEXT", "IN_PERSON", "OTHER"]),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  summary: z.string().trim().min(1, "A short summary is required").max(2000),
  occurredAt: dateStr.optional().or(z.literal("")),
});

export type CommunicationInput = z.infer<typeof communicationSchema>;

/** Create a follow-up task on a request. */
export const taskSchema = z.object({
  title: z.string().trim().min(1, "A task title is required").max(200),
  dueAt: dateStr.optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;
