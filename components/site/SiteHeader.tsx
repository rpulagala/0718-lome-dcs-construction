import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          DCS<span className="text-amber-600"> Construction</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/services" className="text-slate-600 hover:text-slate-900">
            Construction
          </Link>
          <Link
            href="/request"
            className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800"
          >
            Request a Site Visit
          </Link>
          <Link href="/signin" className="text-slate-500 hover:text-slate-900">
            Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}
