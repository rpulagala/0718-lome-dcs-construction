import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A valid date is required")
  .optional()
  .or(z.literal(""));

/** A money amount as a string with up to 2 decimals, e.g. "12500.00". */
const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount")
  .optional()
  .or(z.literal(""));

/** Create or edit an estimate. */
export const estimateSchema = z.object({
  description: optionalText(2000),
  amount: money,
  expiresAt: dateStr,
  internalNotes: optionalText(2000),
  customerNotes: optionalText(2000),
});

export type EstimateInput = z.infer<typeof estimateSchema>;

/** Convert an accepted estimate into a project. */
export const projectSchema = z.object({
  name: z.string().trim().min(1, "A project name is required").max(200),
  projectManagerId: z.string().optional().or(z.literal("")),
  contractAmount: money,
  plannedStartDate: dateStr,
  plannedEndDate: dateStr,
  internalNotes: optionalText(2000),
});

export type ProjectInput = z.infer<typeof projectSchema>;

/** Edit an existing project (all fields optional; status handled separately). */
export const projectUpdateSchema = projectSchema.partial().extend({
  actualStartDate: dateStr,
  actualEndDate: dateStr,
});

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

/** Add or edit a project milestone. */
export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "A milestone title is required").max(200),
  description: optionalText(1000),
  dueAt: dateStr,
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;
