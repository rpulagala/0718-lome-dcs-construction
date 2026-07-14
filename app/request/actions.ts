"use server";

import { headers } from "next/headers";
import { workRequestSchema } from "@/lib/validation/workRequest";
import { createWorkRequest } from "@/lib/services/requestService";
import { rateLimit } from "@/lib/services/rateLimit";
import { logger } from "@/lib/logger";

export interface SubmitState {
  ok: boolean;
  requestNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitWorkRequest(raw: unknown): Promise<SubmitState> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`submit:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return {
      ok: false,
      error: "Too many submissions. Please wait a moment and try again.",
    };
  }

  const parsed = workRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    const res = await createWorkRequest(parsed.data);
    return { ok: true, requestNumber: res.requestNumber };
  } catch (err) {
    logger.error("submit.failed", { error: String(err) });
    return {
      ok: false,
      error: "Something went wrong submitting your request. Please try again.",
    };
  }
}
