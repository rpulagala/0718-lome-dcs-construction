import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { formatRequestNumber } from "@/lib/domain/requestNumber";
import { addBusinessHours } from "@/lib/domain/businessHours";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { WorkRequestInput } from "@/lib/validation/workRequest";
import { renderConfirmation, renderInternalNewRequest } from "./emailTemplates";
import { sendEmail } from "./mailService";
import { getSetting } from "./settings";
import { intakeRecipientsSchema } from "@/lib/validation/admin";

const RESPONSE_SLA_HOURS = 48;

/**
 * Intake alert recipients come from the admin-managed setting when configured,
 * falling back to the `INTAKE_NOTIFY_EMAILS` env list. Never throws.
 */
async function resolveIntakeRecipients(): Promise<string[]> {
  try {
    const parsed = intakeRecipientsSchema.safeParse(await getSetting("intake_notify_emails"));
    if (parsed.success && parsed.data.emails.length > 0) return parsed.data.emails;
  } catch {
    // fall through to env default
  }
  return env.INTAKE_NOTIFY_EMAILS;
}

export interface CreateResult {
  id: string;
  requestNumber: string;
  duplicate: boolean;
}

interface CreatedDetails {
  id: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  categoryName: string;
  city: string;
  serviceLocation: string;
  description: string;
}

async function findByIdempotencyKey(key: string) {
  return prisma.workRequest.findUnique({
    where: { idempotencyKey: key },
    select: { id: true, requestNumber: true },
  });
}

/**
 * Create a work request atomically: allocate the human-readable number,
 * upsert customer + address, store photo metadata, seed status history and a
 * submission activity. Confirmation and internal-alert emails are sent AFTER
 * the transaction commits and never fail the submission.
 */
export async function createWorkRequest(
  input: WorkRequestInput,
): Promise<CreateResult> {
  // Idempotency: a repeated submission returns the original request.
  const existing = await findByIdempotencyKey(input.idempotencyKey);
  if (existing) return { ...existing, duplicate: true };

  let created: CreatedDetails;
  try {
    created = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const counter = await tx.requestCounter.upsert({
        where: { year },
        update: { lastValue: { increment: 1 } },
        create: { year, lastValue: 1 },
      });
      const requestNumber = formatRequestNumber(year, counter.lastValue);

      const category = await tx.projectCategory.findUniqueOrThrow({
        where: { id: input.categoryId },
      });

      const customer = await tx.customer.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          contactMethod: input.preferredContact,
        },
      });

      const address = await tx.address.create({
        data: {
          street: input.street,
          unit: input.unit || null,
          city: input.city,
          state: input.state,
          zip: input.zip,
          customerId: customer.id,
        },
      });

      const responseDueAt = addBusinessHours(new Date(), RESPONSE_SLA_HOURS);

      const wr = await tx.workRequest.create({
        data: {
          requestNumber,
          customerId: customer.id,
          addressId: address.id,
          categoryId: category.id,
          categoryNameSnapshot: category.name,
          description: input.description,
          budgetRange: input.budgetRange || null,
          desiredTimeframe: input.desiredTimeframe || null,
          referralSource: input.referralSource || null,
          additionalNotes: input.additionalNotes || null,
          preferredContact: input.preferredContact,
          permissionToContact: input.permissionToContact,
          consentAccepted: input.consentAccepted,
          preferredVisitDates: input.preferredVisitDates || null,
          idempotencyKey: input.idempotencyKey,
          responseDueAt,
          photos: {
            create: input.photos.map((p) => ({
              storageKey: p.storageKey,
              fileName: p.fileName,
              contentType: p.contentType,
              sizeBytes: p.sizeBytes,
              width: p.width ?? null,
              height: p.height ?? null,
              uploadedByCustomer: true,
            })),
          },
          statusHistory: { create: { toStatus: "NEW" } },
          activities: {
            create: {
              type: "SUBMITTED",
              summary: "Request submitted by customer",
              isCustomerVisible: true,
            },
          },
        },
        select: { id: true, requestNumber: true },
      });

      return {
        id: wr.id,
        requestNumber: wr.requestNumber,
        customerName: customer.fullName,
        customerEmail: customer.email,
        categoryName: category.name,
        city: address.city,
        serviceLocation: `${address.city}, ${address.state} ${address.zip}`,
        description: input.description,
      };
    });
  } catch (err) {
    // Concurrent duplicate submit: unique violation on idempotencyKey.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const dup = await findByIdempotencyKey(input.idempotencyKey);
      if (dup) return { ...dup, duplicate: true };
    }
    throw err;
  }

  // Post-commit notifications — best effort only.
  try {
    const confirmation = renderConfirmation({
      customerName: created.customerName,
      requestNumber: created.requestNumber,
      categoryName: created.categoryName,
      serviceLocation: created.serviceLocation,
      projectSummary: created.description.slice(0, 400),
    });
    await sendEmail({
      template: "customer_confirmation",
      to: created.customerEmail,
      recipientType: "customer",
      workRequestId: created.id,
      relatedRequestId: created.id,
      ...confirmation,
    });

    const intakeRecipients = await resolveIntakeRecipients();
    for (const to of intakeRecipients) {
      const alert = renderInternalNewRequest({
        requestNumber: created.requestNumber,
        categoryName: created.categoryName,
        customerName: created.customerName,
        city: created.city,
        description: created.description.slice(0, 400),
      });
      await sendEmail({
        template: "internal_new_request",
        to,
        recipientType: "employee",
        workRequestId: created.id,
        relatedRequestId: created.id,
        ...alert,
      });
    }
  } catch (err) {
    logger.error("request.notify_failed", {
      requestId: created.id,
      error: String(err),
    });
  }

  return {
    id: created.id,
    requestNumber: created.requestNumber,
    duplicate: false,
  };
}

/** Minimal, non-PII request info for the public confirmation page. */
export async function getConfirmationInfo(requestNumber: string) {
  return prisma.workRequest.findUnique({
    where: { requestNumber },
    select: {
      requestNumber: true,
      categoryNameSnapshot: true,
      createdAt: true,
      _count: { select: { photos: true } },
    },
  });
}
