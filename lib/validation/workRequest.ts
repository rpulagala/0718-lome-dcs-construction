import { z } from "zod";

/** Kept in sync with company upload settings; server re-checks the DB limit. */
export const MAX_PHOTOS = 10;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const photoMetaSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type PhotoMeta = z.infer<typeof photoMetaSchema>;

export const workRequestSchema = z.object({
  // Required
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  phone: z.string().trim().min(7, "A valid phone number is required").max(30),
  email: z.email("A valid email address is required").max(200),
  street: z.string().trim().min(1, "Street address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(50),
  zip: z.string().trim().min(3, "ZIP code is required").max(12),
  categoryId: z.string().min(1, "Please choose a project category"),
  description: z
    .string()
    .trim()
    .min(10, "Please describe your project (at least 10 characters)")
    .max(5000),
  preferredContact: z.enum(["PHONE", "EMAIL", "TEXT"]),
  permissionToContact: z
    .boolean()
    .refine((v) => v === true, "Permission to contact is required"),
  consentAccepted: z
    .boolean()
    .refine((v) => v === true, "You must accept the privacy and submission consent"),

  // Optional
  unit: optionalText(50),
  preferredVisitDates: optionalText(200),
  budgetRange: optionalText(50),
  desiredTimeframe: optionalText(100),
  referralSource: optionalText(100),
  additionalNotes: optionalText(2000),

  // System
  idempotencyKey: z.string().min(8).max(64),
  photos: z.array(photoMetaSchema).max(MAX_PHOTOS).default([]),
});

export type WorkRequestInput = z.infer<typeof workRequestSchema>;

/**
 * In-app "New request" schema for a signed-in portal customer. The customer's
 * email, permission-to-contact, and consent are supplied server-side from the
 * authenticated account (never trusted from the client), so they're omitted here.
 */
export const portalRequestSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name").max(120),
  phone: z.string().trim().min(7, "A valid phone number is required").max(30),
  street: z.string().trim().min(1, "Street address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(50),
  zip: z.string().trim().min(3, "ZIP code is required").max(12),
  categoryId: z.string().min(1, "Please choose a project category"),
  description: z
    .string()
    .trim()
    .min(10, "Please describe your project (at least 10 characters)")
    .max(5000),
  preferredContact: z.enum(["PHONE", "EMAIL", "TEXT"]),

  unit: optionalText(50),
  preferredVisitDates: optionalText(200),
  budgetRange: optionalText(50),
  desiredTimeframe: optionalText(100),
  additionalNotes: optionalText(2000),

  idempotencyKey: z.string().min(8).max(64),
  photos: z.array(photoMetaSchema).max(MAX_PHOTOS).default([]),
});

export type PortalRequestInput = z.infer<typeof portalRequestSchema>;

/** Empty defaults for the portal "New request" form (before prefill). */
export const portalRequestDefaults = {
  fullName: "",
  phone: "",
  street: "",
  unit: "",
  city: "",
  state: "",
  zip: "",
  categoryId: "",
  description: "",
  preferredContact: "PHONE" as const,
  preferredVisitDates: "",
  budgetRange: "",
  desiredTimeframe: "",
  additionalNotes: "",
};

/** Empty defaults for the client form. */
export const workRequestDefaults = {
  fullName: "",
  phone: "",
  email: "",
  street: "",
  unit: "",
  city: "",
  state: "",
  zip: "",
  categoryId: "",
  description: "",
  preferredContact: "PHONE" as const,
  permissionToContact: false,
  consentAccepted: false,
  preferredVisitDates: "",
  budgetRange: "",
  desiredTimeframe: "",
  referralSource: "",
  additionalNotes: "",
};
