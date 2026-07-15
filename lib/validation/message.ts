import { z } from "zod";
import { photoMetaSchema } from "@/lib/validation/workRequest";

export const MAX_MESSAGE_ATTACHMENTS = 6;

/**
 * A customer-sent message: body and/or at least one photo attachment. Empty
 * messages (no text, no photo) are rejected.
 */
export const portalMessageSchema = z
  .object({
    body: z.string().trim().max(4000).default(""),
    attachments: z.array(photoMetaSchema).max(MAX_MESSAGE_ATTACHMENTS).default([]),
  })
  .refine((v) => v.body.length > 0 || v.attachments.length > 0, {
    message: "Type a message or add a photo.",
    path: ["body"],
  });

export type PortalMessageInput = z.infer<typeof portalMessageSchema>;

/** A staff reply — text only in this phase. */
export const staffMessageSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(4000),
});

export type StaffMessageInput = z.infer<typeof staffMessageSchema>;
