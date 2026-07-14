import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata = { title: "Privacy Policy — DCS Construction" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl px-6 py-12 prose prose-slate">
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-4 text-slate-600">
          DCS Construction collects the information you submit through our work
          request form solely to respond to and manage your request. We do not
          sell your personal information. Uploaded photos are stored securely and
          are accessible only to authorized DCS staff. This is placeholder copy
          for the MVP and should be replaced with the company&rsquo;s reviewed
          privacy policy before launch.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
