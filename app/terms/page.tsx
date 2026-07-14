import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata = { title: "Terms — DCS Construction" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl px-6 py-12 prose prose-slate">
        <h1 className="text-2xl font-bold text-slate-900">Terms of Use</h1>
        <p className="mt-4 text-slate-600">
          By submitting a request you confirm the information provided is accurate
          and that you are authorized to request work at the given address.
          Submitting a request does not constitute a contract. This is placeholder
          copy for the MVP and should be replaced with the company&rsquo;s reviewed
          terms before launch.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
