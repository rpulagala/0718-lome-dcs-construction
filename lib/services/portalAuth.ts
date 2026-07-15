import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { renderPortalLoginCode } from "./emailTemplates";
import { sendEmail } from "./mailService";
import { logger } from "@/lib/logger";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

function hashCode(code: string, email: string): string {
  return crypto
    .createHmac("sha256", env.AUTH_SECRET || "dev-portal-secret-change-me")
    .update(`${code}:${email}`)
    .digest("hex");
}

function genCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Issue a one-time login code to `email`. Always resolves ok for a valid email
 * shape (never reveals whether an account exists). The code is emailed; only its
 * hash is stored.
 *
 * When no real email provider is wired (`EMAIL_MODE !== "resend"`, i.e. the code
 * is only logged, never delivered), the plaintext code is returned as `devCode`
 * so a demo instance is usable without email. This is intentionally NOT returned
 * once real email is configured.
 */
export async function requestLoginCode(
  rawEmail: string,
): Promise<{ ok: boolean; devCode?: string }> {
  const email = normEmail(rawEmail);
  if (!EMAIL_RE.test(email)) return { ok: false };

  const code = genCode();
  await prisma.customerLoginCode.create({
    data: { email, codeHash: hashCode(code, email), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  try {
    const mail = renderPortalLoginCode({ code });
    await sendEmail({ template: "portal_login_code", to: email, recipientType: "customer", ...mail });
  } catch (err) {
    logger.error("portal.code_email_failed", { error: String(err) });
  }

  const emailDelivered = env.EMAIL_MODE === "resend" && Boolean(env.RESEND_API_KEY);
  return emailDelivered ? { ok: true } : { ok: true, devCode: code };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  account?: { id: string; email: string; name: string | null };
}

/**
 * Verify a login code. On success: consume the code, create-or-update the
 * CustomerAccount (pulling name/phone from an existing customer record if any),
 * link that customer's unclaimed work requests to the account, and return it.
 */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<VerifyResult> {
  const email = normEmail(rawEmail);
  const code = rawCode.trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }

  const rec = await prisma.customerLoginCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return { ok: false, error: "That code has expired. Request a new one." };
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const expected = Buffer.from(rec.codeHash);
  const actual = Buffer.from(hashCode(code, email));
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) {
    await prisma.customerLoginCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code. Please try again." };
  }

  const account = await prisma.$transaction(async (tx) => {
    await tx.customerLoginCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });

    const existing = await tx.customer.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { fullName: true, phone: true },
    });

    const acct = await tx.customerAccount.upsert({
      where: { email },
      update: {
        lastLoginAt: new Date(),
        ...(existing ? { name: existing.fullName, phone: existing.phone } : {}),
      },
      create: {
        email,
        name: existing?.fullName ?? null,
        phone: existing?.phone ?? null,
        lastLoginAt: new Date(),
      },
    });

    // Claim this customer's unlinked requests (relation filters aren't allowed in
    // updateMany, so resolve the customer ids first).
    const customers = await tx.customer.findMany({ where: { email }, select: { id: true } });
    const ids = customers.map((c) => c.id);
    if (ids.length > 0) {
      await tx.workRequest.updateMany({
        where: { customerAccountId: null, customerId: { in: ids } },
        data: { customerAccountId: acct.id },
      });
    }
    return acct;
  });

  return { ok: true, account: { id: account.id, email: account.email, name: account.name } };
}
