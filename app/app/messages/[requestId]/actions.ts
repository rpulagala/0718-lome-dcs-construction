"use server";

import { getPortalSession } from "@/lib/portal/session";
import { portalMessageSchema } from "@/lib/validation/message";
import { sendPortalMessage } from "@/lib/services/messaging";
import { rateLimit } from "@/lib/services/rateLimit";
import { logger } from "@/lib/logger";

export interface SendMessageState {
  ok: boolean;
  error?: string;
}

export async function sendPortalMessageAction(
  requestId: string,
  raw: unknown,
): Promise<SendMessageState> {
  const session = await getPortalSession();
  if (!session) return { ok: false, error: "Your session has expired. Please sign in again." };

  const rl = rateLimit(`portal-message:${session.sub}`, 30, 60_000);
  if (!rl.ok) return { ok: false, error: "You're sending messages too quickly. Please wait a moment." };

  const parsed = portalMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Type a message or add a photo." };
  }

  try {
    const res = await sendPortalMessage(session.sub, requestId, parsed.data);
    if (!res) return { ok: false, error: "We couldn't find that conversation." };
    return { ok: true };
  } catch (err) {
    logger.error("portal.message_send_failed", { accountId: session.sub, error: String(err) });
    return { ok: false, error: "Something went wrong sending your message. Please try again." };
  }
}
