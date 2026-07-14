import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getConfirmationInfo } from "@/lib/services/requestService";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: "Request Received — DCS Construction",
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ requestNumber: string }>;
}) {
  const { requestNumber } = await params;
  const info = await getConfirmationInfo(requestNumber);
  if (!info) notFound();

  const submitted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(info.createdAt);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Thank you for your interest in DCS Construction
          </h1>
          <p className="mt-2 max-w-prose text-slate-600" data-testid="confirmation-message">
            Your request has been received. Our team will review it and contact
            you within 48 business hours.
          </p>
        </div>

        <dl className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-500">Request number</dt>
            <dd className="font-semibold text-slate-900" data-testid="confirmation-number">
              {info.requestNumber}
            </dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-500">Project category</dt>
            <dd className="text-slate-900">{info.categoryNameSnapshot}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-500">Submitted</dt>
            <dd className="text-slate-900">{submitted}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-500">Photos attached</dt>
            <dd className="text-slate-900">{info._count.photos}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-slate-500">Expected response</dt>
            <dd className="text-slate-900">Within 48 business hours</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Keep your request number for reference. Questions? Call{" "}
          <span className="font-medium text-slate-900">415-555-0100</span> or email{" "}
          <span className="font-medium text-slate-900">hello@dcsconstruction.example</span>.
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
