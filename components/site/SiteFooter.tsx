import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-brand-navy font-brand text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="text-lg font-semibold tracking-[0.2em]">DCS CONSTRUCTION</p>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/70">
            Residential &amp; commercial construction, remodels, and repairs
            across the San Francisco Bay Area.
          </p>
        </div>
        <div className="text-sm font-light text-white/80">
          <p className="font-semibold uppercase tracking-[0.15em] text-white">Contact</p>
          <p className="mt-3">Phone: 415-515-0470</p>
          <p>Email: dancanest@gmail.com</p>
          <p>Service area: SF Bay Area</p>
        </div>
        <div className="text-sm font-light text-white/80">
          <p className="font-semibold uppercase tracking-[0.15em] text-white">Company</p>
          <ul className="mt-3 space-y-1.5">
            <li><Link href="/services" className="hover:text-white hover:underline">Services</Link></li>
            <li><Link href="/request" className="hover:text-white hover:underline">Request a Site Visit</Link></li>
            <li><Link href="/privacy" className="hover:text-white hover:underline">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white hover:underline">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 py-5 text-center text-xs font-light tracking-wide text-white/60">
        © {new Date().getFullYear()} DCS Construction. All rights reserved.
      </div>
    </footer>
  );
}
