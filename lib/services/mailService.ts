import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface SendEmailParams {
  template: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  recipientType: "customer" | "employee" | "admin";
  workRequestId?: string;
  relatedRequestId?: string;
}

/**
 * Provider-agnostic email send. Always records a Notification + EmailLog so
 * delivery is auditable. In "log" mode it prints a preview instead of sending.
 * Failures are logged and returned, never thrown — callers must not fail the
 * user's action because an email did not go out (see docs/SECURITY.md).
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<{ ok: boolean }> {
  const notification = await prisma.notification.create({
    data: {
      workRequestId: params.workRequestId ?? null,
      recipientType: params.recipientType,
      recipient: params.to,
      template: params.template,
      channel: "email",
    },
  });

  const emailLog = await prisma.emailLog.create({
    data: {
      notificationId: notification.id,
      recipient: params.to,
      template: params.template,
      relatedRequestId: params.relatedRequestId ?? null,
      status: "QUEUED",
    },
  });

  try {
    if (env.EMAIL_MODE === "resend" && env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (res.error) throw new Error(res.error.message);
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "SENT", providerMessageId: res.data?.id ?? null },
      });
    } else {
      // Local preview mode.
      logger.info("email.preview", {
        template: params.template,
        to: params.to,
        subject: params.subject,
      });
      console.log(
        `\n──── EMAIL (${params.template}) ────\nTo: ${params.to}\nSubject: ${params.subject}\n\n${params.text}\n────────────────────────────\n`,
      );
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "SENT" },
      });
    }
    return { ok: true };
  } catch (err) {
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage: String(err).slice(0, 500),
        retryCount: { increment: 1 },
      },
    });
    logger.error("email.send_failed", {
      template: params.template,
      to: params.to,
      error: String(err),
    });
    return { ok: false };
  }
}
