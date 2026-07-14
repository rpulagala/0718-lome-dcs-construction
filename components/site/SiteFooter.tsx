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
          <p className="font-semibold uppercase tracking-[0.15em] text-white">Explore</p>
          <ul className="mt-3 space-y-1.5">
            <li><a href="https://www.dcsconstructs.com/#facilitiesmaintenance-section" className="hover:text-white hover:underline">Construction Services</a></li>
            <li><a href="https://www.dcsconstructs.com/#construction-consultation-section" className="hover:text-white hover:underline">Building Consultation</a></li>
            <li><a href="https://www.dcsconstructs.com/#facilities-maintenance-section" className="hover:text-white hover:underline">Facilities Maintenance</a></li>
            <li><a href="https://www.dcsconstructs.com/#about-section" className="hover:text-white hover:underline">About</a></li>
            <li><a href="https://www.dcsconstructs.com/#rsvp-section" className="hover:text-white hover:underline">Contact</a></li>
            <li><a href="http://dancanhandymansf.blogspot.com/" className="hover:text-white hover:underline">Blog</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 py-5 text-center text-xs font-light tracking-wide text-white/60">
        © {new Date().getFullYear()} DCS Construction. All rights reserved.
      </div>
    </footer>
  );
}
