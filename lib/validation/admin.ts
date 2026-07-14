import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const ROLE_VALUES = ["EMPLOYEE", "MANAGER", "PRINCIPAL_ADMIN"] as const;

// ----- Users -----
export const userInviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("A valid email is required").max(200),
  role: z.enum(ROLE_VALUES),
  phone: optionalText(40),
});
export type UserInviteInput = z.infer<typeof userInviteSchema>;

export const userEditSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  role: z.enum(ROLE_VALUES),
  phone: optionalText(40),
});
export type UserEditInput = z.infer<typeof userEditSchema>;

// ----- Categories -----
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: optionalText(300),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryEditSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: optionalText(300),
});
export type CategoryEditInput = z.infer<typeof categoryEditSchema>;

// ----- Company & workflow settings -----
export const RequestStatusValues = [
  "NEW",
  "REVIEWING",
  "NEEDS_MORE_INFORMATION",
] as const;
export const PriorityValues = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(120),
  phone: optionalText(40),
  email: z.string().trim().toLowerCase().email("A valid email is required").max(200).or(z.literal("")),
  address: optionalText(300),
  serviceArea: optionalText(300),
});
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const responseMessageSchema = z.object({
  text: z.string().trim().min(1, "A response message is required").max(1000),
});
export type ResponseMessageInput = z.infer<typeof responseMessageSchema>;

/** Comma/newline separated list of recipient emails, validated individually. */
export const intakeRecipientsSchema = z.object({
  emails: z
    .array(z.string().trim().toLowerCase().email("Each recipient must be a valid email"))
    .max(20, "At most 20 recipients"),
});
export type IntakeRecipientsInput = z.infer<typeof intakeRecipientsSchema>;

export const uploadLimitsSchema = z.object({
  maxFiles: z.coerce.number().int().min(1, "At least 1 file").max(50),
  maxMb: z.coerce.number().int().min(1, "At least 1 MB").max(100),
});
export type UploadLimitsInput = z.infer<typeof uploadLimitsSchema>;

export const workflowDefaultsSchema = z.object({
  defaultStatus: z.enum(RequestStatusValues),
  defaultPriority: z.enum(PriorityValues),
  responseTargetHours: z.coerce.number().int().min(1, "At least 1 hour").max(240),
  autoAssign: z.boolean().default(false),
  notifyOnNewRequest: z.boolean().default(true),
});
export type WorkflowDefaultsInput = z.infer<typeof workflowDefaultsSchema>;

/** Maps a settings key to its schema so a single action can validate any setting. */
export const SETTING_SCHEMAS = {
  company_profile: companyProfileSchema,
  response_message: responseMessageSchema,
  intake_notify_emails: intakeRecipientsSchema,
  upload_limits: uploadLimitsSchema,
  workflow_defaults: workflowDefaultsSchema,
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
