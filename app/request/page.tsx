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
      <main className="mx-auto max-w-3xl px-6 py-14 font-brand text-brand-ink">
        <h1 className="text-4xl font-light tracking-wide text-brand-ink">Contact Us</h1>
        <p className="mt-3 max-w-xl text-[17px] font-light leading-relaxed text-brand-navy">
          Please take a moment to tell us about yourself and your project and we&rsquo;ll
          get back to you as soon as possible with your free project estimate.
          Fields marked with * are required.
        </p>
        <div className="mt-10">
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
