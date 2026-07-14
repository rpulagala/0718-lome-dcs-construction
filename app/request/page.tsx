import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { WorkRequestForm } from "@/components/request/WorkRequestForm";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Request a Site Visit — DCS Construction",
  description:
    "Tell us about your construction project and request a free site visit. We respond within 48 business hours.",
};

export default async function RequestPage() {
  const categories = await prisma.projectCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Request a Site Visit</h1>
        <p className="mt-2 text-slate-600">
          Share a few details about your project and our team will get back to you
          within 48 business hours. Fields marked with * are required.
        </p>
        <div className="mt-8">
          <WorkRequestForm
            categories={categories}
            maxPhotos={env.MAX_UPLOAD_FILES}
            maxMb={env.MAX_UPLOAD_MB}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
