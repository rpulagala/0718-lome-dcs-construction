import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProjectGallery } from "@/components/site/ProjectGallery";
import { residentialProjects, commercialProjects } from "@/lib/content/galleries";

const services = [
  { title: "Residential", body: "Kitchen & bath remodels, additions, decks, painting, and repairs." },
  { title: "Commercial", body: "Tenant buildouts, office renovations, and facility upgrades." },
  { title: "Repairs & Handyman", body: "Interior and exterior repairs, electrical and plumbing upgrades." },
];

const testimonials = [
  { quote: "DCS turned our dated kitchen into the heart of our home. On time and on budget.", name: "Homeowner, San Francisco" },
  { quote: "Professional crew, clear communication, and quality work on our office buildout.", name: "Operations Manager, Oakland" },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            DCS Construction
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold sm:text-5xl">
            Build with a team you can trust.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Residential and commercial construction, remodels, and repairs across
            the San Francisco Bay Area. Request a site visit and we&rsquo;ll get
            back to you within 48 business hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/request"
              className="rounded-md bg-amber-500 px-6 py-3 font-medium text-slate-900 hover:bg-amber-400"
            >
              Request a Site Visit
            </Link>
            <Link
              href="/services"
              className="rounded-md border border-slate-600 px-6 py-3 font-medium text-white hover:bg-slate-800"
            >
              View Our Work
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-6 py-16 sm:grid-cols-3" aria-label="Services">
          {services.map((s) => (
            <div key={s.title} className="rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="pb-8" aria-labelledby="home-residential">
          <div className="flex items-end justify-between">
            <h2 id="home-residential" className="text-2xl font-bold text-slate-900">
              Residential work
            </h2>
            <Link href="/services" className="text-sm font-medium text-amber-700 hover:underline">
              See all →
            </Link>
          </div>
          <div className="mt-5">
            <ProjectGallery items={residentialProjects.slice(0, 3)} />
          </div>
        </section>

        <section className="py-8" aria-labelledby="home-commercial">
          <div className="flex items-end justify-between">
            <h2 id="home-commercial" className="text-2xl font-bold text-slate-900">
              Commercial work
            </h2>
            <Link href="/services" className="text-sm font-medium text-amber-700 hover:underline">
              See all →
            </Link>
          </div>
          <div className="mt-5">
            <ProjectGallery items={commercialProjects.slice(0, 3)} />
          </div>
        </section>

        <section className="grid gap-6 py-16 sm:grid-cols-2" aria-label="Testimonials">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="rounded-lg bg-slate-50 p-6">
              <p className="text-slate-800">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-3 text-sm font-medium text-slate-500">
                — {t.name}
              </footer>
            </blockquote>
          ))}
        </section>

        <section className="mb-16 rounded-xl bg-slate-900 px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold">Ready to start your project?</h2>
          <p className="mt-2 text-slate-300">
            Tell us what you have in mind and request a free site visit.
          </p>
          <div className="mt-6">
            <Link
              href="/request"
              className="rounded-md bg-amber-500 px-6 py-3 font-medium text-slate-900 hover:bg-amber-400"
            >
              Request a Site Visit
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
