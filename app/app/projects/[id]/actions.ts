"use server";

import { getPortalSession } from "@/lib/portal/session";
import {
  respondToPortalEstimate,
  type EstimateDecision,
} from "@/lib/services/portalEstimates";
import { rateLimit } from "@/lib/services/rateLimit";
import { logger } from "@/lib/logger";

export interface EstimateResponseState {
  ok: boolean;
  error?: string;
}

/** Customer accepts or declines one of their sent estimates from the portal. */
export async function respondToEstimateAction(
  estimateId: string,
  decision: EstimateDecision,
): Promise<EstimateResponseState> {
  const session = await getPortalSession();
  if (!session) return { ok: false, error: "Your session has expired. Please sign in again." };

  if (decision !== "accept" && decision !== "decline") {
    return { ok: false, error: "Invalid request." };
  }

  const rl = rateLimit(`portal-estimate:${session.sub}`, 20, 60_000);
  if (!rl.ok) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  try {
    const res = await respondToPortalEstimate(session.sub, estimateId, decision);
    if (!res.ok) {
      // Don't leak ownership: an unowned/unknown estimate reads as a generic miss.
      if (res.error === "not_found") return { ok: false, error: "Estimate not found." };
      return { ok: false, error: res.error ?? "Something went wrong. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    logger.error("portal.estimate_respond_failed", {
      accountId: session.sub,
      estimateId,
      decision,
      error: String(err),
    });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
