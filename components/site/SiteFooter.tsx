import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
        <div>
          <p className="text-base font-bold text-slate-900">DCS Construction</p>
          <p className="mt-2 text-sm text-slate-500">
            Residential &amp; commercial construction, remodels, and repairs
            across the San Francisco Bay Area.
          </p>
        </div>
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">Contact</p>
          <p className="mt-2">Phone: 415-555-0100</p>
          <p>Email: hello@dcsconstruction.example</p>
          <p>Service area: SF Bay Area</p>
        </div>
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">Company</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link href="/services" className="hover:text-slate-900">
                Services
              </Link>
            </li>
            <li>
              <Link href="/request" className="hover:text-slate-900">
                Request a Site Visit
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-slate-900">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-slate-900">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} DCS Construction. All rights reserved.
      </div>
    </footer>
  );
}
