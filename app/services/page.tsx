import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProjectGallery } from "@/components/site/ProjectGallery";
import { residentialProjects, commercialProjects } from "@/lib/content/galleries";

export const metadata: Metadata = {
  title: "Construction Services — DCS Construction",
  description:
    "Residential and commercial construction, remodels, and repairs. Browse completed projects and schedule a site visit.",
};

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900">Construction Services</h1>
          <p className="mt-3 text-slate-600">
            From kitchen and bath remodels to full commercial buildouts, DCS
            Construction delivers quality work on time and on budget. Explore a
            selection of our completed projects below, then schedule a free site
            visit to discuss yours.
          </p>
          <div className="mt-6">
            <Link
              href="/request"
              className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              Schedule a Site Visit
            </Link>
          </div>
        </div>

        <section className="mt-12" aria-labelledby="residential-heading">
          <h2 id="residential-heading" className="text-xl font-semibold text-slate-900">
            Residential Projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Remodels, additions, decks, painting, and repairs for homes.
          </p>
          <div className="mt-5">
            <ProjectGallery items={residentialProjects} />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="commercial-heading">
          <h2 id="commercial-heading" className="text-xl font-semibold text-slate-900">
            Commercial Projects
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tenant buildouts, office renovations, and facility upgrades.
          </p>
          <div className="mt-5">
            <ProjectGallery items={commercialProjects} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
