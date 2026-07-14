import Link from "next/link";

const navLink =
  "text-[13px] font-normal uppercase tracking-[0.15em] text-white/70 transition-colors hover:text-white";

export function SiteHeader() {
  return (
    <header className="font-brand">
      {/* Utility bar */}
      <div className="flex items-center justify-between bg-white text-[13px] tracking-wide text-brand-navy">
        <div className="px-6 py-2">
          Call Us Today:{" "}
          <a href="tel:4155150470" className="hover:underline">415-515-0470</a>
        </div>
        <div className="bg-slate-100 px-6 py-2 text-slate-600">
          Contractor&rsquo;s License No. 962105
        </div>
      </div>

      {/* Main navy nav */}
      <div className="bg-brand-navy">
        <div className="grid grid-cols-3 items-center px-6 py-4">
          <nav className="flex items-center gap-6">
            <a href="https://www.dcsconstructs.com/" className={navLink}>Home</a>
            <a href="https://www.dcsconstructs.com/#facilitiesmaintenance-section" className={navLink}>
              Construction Services
            </a>
          </nav>
          <div className="text-center">
            <a
              href="https://www.dcsconstructs.com/"
              className="text-2xl font-semibold tracking-[0.35em] text-white"
              aria-label="DCS Construction home"
            >
              DCS
            </a>
          </div>
          <nav className="flex items-center justify-end gap-6">
            <a href="https://www.dcsconstructs.com/#rsvp-section" className={navLink}>Contact</a>
            <Link href="/signin" className={navLink}>Staff</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
