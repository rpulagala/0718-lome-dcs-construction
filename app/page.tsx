import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata = {
  title: "DCS Construction — Residential & Commercial Construction and Building Consultants",
  description:
    "DCS Construction offers a broad range of residential and commercial construction, building consultation, and facilities maintenance services across the San Francisco Bay Area.",
};

const constructionServices = [
  { title: "Plumbing", body: "Add or replace fixtures, repair leaks, repair/replace water supplies, toilet repair." },
  { title: "Electrical", body: "Dimmer switches, install/replace ceiling fans, replace switches/outlets, replace circuit breakers, label panels." },
  { title: "Bathrooms", body: "Wall & floor tile repair/install, caulking, shower doors, fixtures installed/replaced, towel racks, remodeling." },
  { title: "Interior", body: "Drywall repair/texture, doors hung/repaired, trim carpentry, shelving/storage, window install/repair, painting, wallpaper." },
  { title: "Exterior", body: "Fences & gates, patios/decks, gutters, siding/fascia/soffit, windows, brick & stone walkways, cement, landscaping, painting." },
  { title: "Kitchens", body: "Disposals, countertops, ice/water lines, cabinet doors & upgrades, breakfast nooks, new hardware, appliance installation." },
  { title: "Pet", body: "Build dog houses, pet doors, and dog runs." },
  { title: "Garage", body: "Inspect, repair & replace doors; clean/organize; shelving & lighting; paint floors; finish drywall." },
  { title: "Energy Efficiency", body: "Weather-strip doors/windows, energy-saving bulbs, attic insulation, whole-house fans." },
  { title: "Independent Living", body: "Grab bars & railings, porch/landing ramps, widen doorways, retrofit faucets/controls, shower/tub seats." },
  { title: "Heating / Cooling", body: "Filter replacement, hypoallergenic filters, vent-direction adjustment." },
  { title: "Bedrooms", body: "Closet doors & track alignment, organizers, added shelving/closets, closet lining, hang pictures." },
  { title: "Home Safety", body: "Smoke/gas detectors, electrical grounding & polarity, earthquake proofing, water-heater strapping, child-proofing, fire extinguishers." },
];

const consultationSteps = [
  "Conduct research and site visits to understand the nature of any existing complaints — including visits to building departments and review of archives and documentation.",
  "Secure necessary permits and the master job card, with final signature from the building department, allowing a Certificate of Final Completion and Occupancy.",
  "Secure the services of an architect and develop the plans needed to address any complaints or direction from the inspector and/or building department.",
  "Submit estimates, timelines, and scope documents for the execution of any construction services required by the plans and building-department requirements.",
  "Schedule and attend required inspections, document any revisions, and ensure inspections are passed and final authorization is secured.",
];

const facilitiesServices = [
  "Licensed General Contractor", "Carpentry / Finish Carpentry", "Painting", "Electrical",
  "Drywall", "VCT Tile Replacement / Install", "Low Voltage Implementation", "Flooring",
  "Millwork Installation", "Removal or Disposal Services", "Fixture Installation", "HVAC",
  "FRP Panelling / Install", "High Tech Services", "Store Remodels", "New Openings",
];

const whyChoose = [
  { title: "Quality Work", body: "Our staff of subject-matter experts delivers consistent, quality work on every job." },
  { title: "Competitive Pricing", body: "A wide variety of services at a competitive price. Call for a quote!" },
  { title: "Experience", body: "An experienced construction industry leader in the Bay Area since 1992." },
];

const redBtn =
  "inline-block rounded-full bg-brand-red px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-red-dark";
const heading = "text-3xl font-light tracking-wide text-brand-ink";

export default function HomePage() {
  return (
    <div className="font-brand text-brand-ink">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-navy to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="text-4xl font-light tracking-[0.15em] sm:text-5xl">DCS CONSTRUCTION</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-light text-blue-100">
            Residential and Commercial Construction and Building Consultants
          </p>
          <div className="mt-8">
            <Link href="/request" className={redBtn}>Contact Us Today</Link>
          </div>
        </div>
      </section>

      {/* Construction Services */}
      <section id="construction-services" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className={heading}>Construction Services</h2>
          <p className="mt-4 max-w-3xl text-[15px] font-light leading-relaxed text-slate-600">
            DCS Construction offers a broad range of residential and commercial construction services.
            Staffed by highly skilled professionals, we fix, repair, and improve your property
            efficiently — with a 1-year limited guarantee on our craftsmanship. We pride ourselves on
            our expertise, reliability, and cost-efficient prices.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {constructionServices.map((s) => (
              <div key={s.title} className="rounded-lg border border-slate-200 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-navy">{s.title}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/request" className={redBtn}>Get Your Free Estimate</Link>
          </div>
        </div>
      </section>

      {/* Building & Construction Consultation */}
      <section id="consultation" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className={heading}>Building and Construction Consultation</h2>
          <p className="mt-4 max-w-3xl text-[15px] font-light leading-relaxed text-slate-600">
            Building and construction consultation services to bring properties into compliance with
            city Building Departments. We handle the full process end to end:
          </p>
          <ul className="mt-6 max-w-3xl space-y-3">
            {consultationSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm font-light leading-relaxed text-slate-600">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Facilities Maintenance */}
      <section id="facilities-maintenance" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className={heading}>Facilities Maintenance</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-[15px] font-light leading-relaxed text-slate-600">
            <p>
              DCS Construction works with businesses and property managers of all sizes. We maintain
              and improve your facilities, rental properties, apartment buildings, restaurants,
              stores, malls, and complexes.
            </p>
            <p>
              We&rsquo;ve been a reliable go-to partner for companies such as Citiscape, Laurel
              Services, The Bay Club, Equinox, Saks 5th Ave, Gap Inc., Gymboree, Nike, Kenneth Cole,
              and Pier 1 Imports — taking care of the loose ends and sudden issues so your company can
              focus on what it does best.
            </p>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {facilitiesServices.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm font-light text-slate-700">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-brand-red" />
                {s}
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/request" className={redBtn}>Learn More</Link>
          </div>
        </div>
      </section>

      {/* Why Choose DCS */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className={heading}>Why Choose DCS Construction?</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-[15px] font-light leading-relaxed text-slate-600">
            <p>
              When it comes to residential and commercial construction, building consultation, and
              facilities management, DCS Construction is an established Bay Area industry leader. Since
              the &rsquo;90s, our team has brought consistent professionalism, craftsmanship, and
              excellent customer care to every engagement.
            </p>
            <p>
              When you hire DCS Construction, you get professional results you don&rsquo;t have to
              micromanage. We pride ourselves on reputable, ethical, and environmentally responsible
              business practices.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {whyChoose.map((w) => (
              <div key={w.title} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-navy">{w.title}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-slate-600">{w.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/request" className={redBtn}>Get a Free Estimate</Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className={heading}>Contact Us</h2>
          <div className="mt-4 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="max-w-md text-[15px] font-light leading-relaxed text-slate-600">
                Please take a moment to tell us about yourself and your project, and we&rsquo;ll get
                back to you as soon as possible with your free project estimate.
              </p>
              <div className="mt-6">
                <Link href="/request" className={redBtn}>Request a Free Estimate</Link>
              </div>
            </div>
            <div className="text-sm font-light text-slate-600">
              <p className="font-semibold uppercase tracking-[0.12em] text-brand-navy">Mailing Address</p>
              <p className="mt-2">220 Cypress Ave</p>
              <p>South San Francisco, California 94080</p>
              <p className="mt-4">
                <span className="font-semibold text-slate-800">Phone:</span>{" "}
                <a href="tel:4155150470" className="hover:underline">415.515.0470</a>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span>{" "}
                <a href="mailto:dancanest@gmail.com" className="hover:underline">dancanest@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
