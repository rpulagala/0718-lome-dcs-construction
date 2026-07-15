import { prisma } from "@/lib/db";
import { createWorkRequest } from "@/lib/services/requestService";
import type { PortalRequestInput } from "@/lib/validation/workRequest";
import type { ContactMethod } from "@/lib/generated/prisma/enums";

export interface PortalPrefill {
  fullName: string;
  phone: string;
  email: string;
  preferredContact: ContactMethod;
  address: { street: string; unit: string; city: string; state: string; zip: string } | null;
}

/**
 * Prefill values for the in-app "New request" form: the account's contact info
 * plus the address from the customer's most recent request (if any), so a
 * returning customer barely has to type.
 */
export async function getPortalPrefill(accountId: string): Promise<PortalPrefill | null> {
  const account = await prisma.customerAccount.findUnique({
    where: { id: accountId },
    select: { email: true, name: true, phone: true },
  });
  if (!account) return null;

  const latest = await prisma.workRequest.findFirst({
    where: { customerAccountId: accountId },
    orderBy: { createdAt: "desc" },
    select: {
      preferredContact: true,
      address: { select: { street: true, unit: true, city: true, state: true, zip: true } },
    },
  });

  return {
    fullName: account.name ?? "",
    phone: account.phone ?? "",
    email: account.email,
    preferredContact: latest?.preferredContact ?? "PHONE",
    address: latest?.address
      ? {
          street: latest.address.street,
          unit: latest.address.unit ?? "",
          city: latest.address.city,
          state: latest.address.state,
          zip: latest.address.zip,
        }
      : null,
  };
}

/**
 * Create a work request on behalf of a signed-in portal customer. The account's
 * canonical email is used (never a client-supplied one) so the request links to
 * this account; permission/consent are implicit for an authenticated in-app
 * submission. The request is stamped with `customerAccountId` so it appears
 * immediately in the customer's app and in the staff console.
 */
export async function createPortalRequest(
  accountId: string,
  input: PortalRequestInput,
): Promise<{ id: string; requestNumber: string; duplicate: boolean }> {
  const account = await prisma.customerAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { email: true },
  });

  const res = await createWorkRequest(
    {
      fullName: input.fullName,
      phone: input.phone,
      email: account.email,
      street: input.street,
      unit: input.unit || "",
      city: input.city,
      state: input.state,
      zip: input.zip,
      categoryId: input.categoryId,
      description: input.description,
      preferredContact: input.preferredContact,
      permissionToContact: true,
      consentAccepted: true,
      budgetRange: input.budgetRange || "",
      desiredTimeframe: input.desiredTimeframe || "",
      referralSource: "Customer app",
      additionalNotes: input.additionalNotes || "",
      preferredVisitDates: input.preferredVisitDates || "",
      idempotencyKey: input.idempotencyKey,
      photos: input.photos,
    },
    { customerAccountId: accountId },
  );

  return res;
}
