import { requirePortalUser } from "@/lib/portal/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getPortalPrefill } from "@/lib/services/portalRequests";
import { NewRequestForm } from "@/components/portal/NewRequestForm";

export default async function NewPortalRequest() {
  const session = await requirePortalUser();
  const [categories, prefill] = await Promise.all([
    prisma.projectCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getPortalPrefill(session.sub),
  ]);

  return (
    <NewRequestForm
      categories={categories}
      maxPhotos={env.MAX_UPLOAD_FILES}
      maxMb={env.MAX_UPLOAD_MB}
      prefill={
        prefill ?? {
          fullName: session.name ?? "",
          phone: "",
          email: session.email,
          preferredContact: "PHONE",
          address: null,
        }
      }
    />
  );
}
