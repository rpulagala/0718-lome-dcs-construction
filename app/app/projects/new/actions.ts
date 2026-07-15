"use server";

import { getPortalSession } from "@/lib/portal/session";
import { portalRequestSchema } from "@/lib/validation/workRequest";
import { createPortalRequest } from "@/lib/services/portalRequests";
import { rateLimit } from "@/lib/services/rateLimit";
import { logger } from "@/lib/logger";

export interface PortalSubmitState {
  ok: boolean;
  id?: string;
  requestNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitPortalRequest(raw: unknown): Promise<PortalSubmitState> {
  const session = await getPortalSession();
  if (!session) return { ok: false, error: "Your session has expired. Please sign in again." };

  const rl = rateLimit(`portal-submit:${session.sub}`, 10, 60_000);
  if (!rl.ok) {
    return { ok: false, error: "Too many submissions. Please wait a moment and try again." };
  }

  const parsed = portalRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    const res = await createPortalRequest(session.sub, parsed.data);
    return { ok: true, id: res.id, requestNumber: res.requestNumber };
  } catch (err) {
    logger.error("portal.submit_failed", { accountId: session.sub, error: String(err) });
    return { ok: false, error: "Something went wrong submitting your request. Please try again." };
  }
}
