"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import type { z } from "zod";
import {
  portalRequestSchema,
  portalRequestDefaults,
  type PhotoMeta,
} from "@/lib/validation/workRequest";
import { PhotoUploader } from "@/components/request/PhotoUploader";
import { submitPortalRequest } from "@/app/app/projects/new/actions";
import type { PortalPrefill } from "@/lib/services/portalRequests";

type FormInput = z.input<typeof portalRequestSchema>;
type FormOutput = z.output<typeof portalRequestSchema>;

interface Category {
  id: string;
  name: string;
}

const STEP_FIELDS: (keyof FormInput)[][] = [
  ["categoryId", "description", "budgetRange", "desiredTimeframe"],
  ["fullName", "phone", "preferredContact", "street", "unit", "city", "state", "zip"],
  ["additionalNotes", "photos"],
];

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-navy dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400";

export function NewRequestForm({
  categories,
  maxPhotos,
  maxMb,
  prefill,
}: {
  categories: Category[];
  maxPhotos: number;
  maxMb: number;
  prefill: PortalPrefill;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; requestNumber: string } | null>(null);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(portalRequestSchema),
    defaultValues: {
      ...portalRequestDefaults,
      fullName: prefill.fullName,
      phone: prefill.phone,
      preferredContact: prefill.preferredContact,
      street: prefill.address?.street ?? "",
      unit: prefill.address?.unit ?? "",
      city: prefill.address?.city ?? "",
      state: prefill.address?.state ?? "",
      zip: prefill.address?.zip ?? "",
      idempotencyKey,
      photos: [],
    },
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const errMsg = (name: keyof FormInput) => errors[name]?.message as string | undefined;
  const fieldError = (name: keyof FormInput) =>
    errMsg(name) ? (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {errMsg(name)}
      </p>
    ) : null;

  async function next() {
    const ok = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (ok) setStep((s) => Math.min(s + 1, STEP_FIELDS.length - 1));
  }

  async function onValid(values: FormOutput) {
    setServerError(null);
    const res = await submitPortalRequest(values);
    if (res.ok && res.id && res.requestNumber) {
      setDone({ id: res.id, requestNumber: res.requestNumber });
      return;
    }
    if (res.fieldErrors) {
      // Jump back to the first step that has an error.
      for (let i = 0; i < STEP_FIELDS.length; i++) {
        if (STEP_FIELDS[i].some((f) => res.fieldErrors![f])) {
          setStep(i);
          break;
        }
      }
      for (const [name, message] of Object.entries(res.fieldErrors)) {
        setError(name as keyof FormInput, { message });
      }
    }
    setServerError(res.error ?? "Submission failed. Please try again.");
  }

  if (done) {
    return (
      <div className="px-5 pt-10 text-center" data-testid="portal-request-success">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-brand-ink dark:text-slate-100">Request sent!</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Thanks — the DCS team has your request{" "}
          <span className="font-semibold text-brand-ink dark:text-slate-200">{done.requestNumber}</span> and will be in
          touch soon. You&apos;ll see updates here as it progresses.
        </p>
        <div className="mt-8 space-y-3">
          <Link
            href={`/app/projects/${done.id}`}
            className="block rounded-full bg-brand-navy py-3 text-sm font-semibold text-white transition-transform active:scale-[0.99]"
            data-testid="view-new-request"
          >
            View request
          </Link>
          <Link href="/app/projects" className="block py-2 text-sm font-medium text-brand-navy dark:text-blue-300">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="px-5 pt-6">
        <button
          type="button"
          onClick={() => (step === 0 ? router.push("/app/projects") : setStep((s) => s - 1))}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy dark:text-blue-300"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {step === 0 ? "Cancel" : "Back"}
        </button>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-brand-ink dark:text-slate-100">
          New request
        </h1>
        {/* Step progress */}
        <div className="mt-3 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-navy" : "bg-slate-200 dark:bg-slate-800"}`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onValid)} className="mt-6 px-5" data-testid="new-request-form" noValidate>
        {/* Step 1 — Project */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="categoryId" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                What kind of work? *
              </label>
              <select
                id="categoryId"
                className={inputClass}
                defaultValue=""
                data-testid="np-category"
                {...register("categoryId")}
              >
                <option value="" disabled>
                  Choose a category…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldError("categoryId")}
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Describe your project *
              </label>
              <textarea
                id="description"
                rows={5}
                className={inputClass}
                placeholder="Tell us what you'd like done…"
                data-testid="np-description"
                {...register("description")}
              />
              {fieldError("description")}
            </div>
            <div>
              <label htmlFor="budgetRange" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Budget range (optional)
              </label>
              <input id="budgetRange" className={inputClass} {...register("budgetRange")} />
            </div>
            <div>
              <label htmlFor="desiredTimeframe" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                When would you like to start? (optional)
              </label>
              <input id="desiredTimeframe" className={inputClass} {...register("desiredTimeframe")} />
            </div>
          </div>
        )}

        {/* Step 2 — Contact & location */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Your name *
              </label>
              <input id="fullName" className={inputClass} data-testid="np-name" {...register("fullName")} />
              {fieldError("fullName")}
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Phone *
              </label>
              <input id="phone" className={inputClass} data-testid="np-phone" {...register("phone")} />
              {fieldError("phone")}
            </div>
            <div>
              <label htmlFor="preferredContact" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Preferred contact method *
              </label>
              <select id="preferredContact" className={inputClass} {...register("preferredContact")}>
                <option value="PHONE">Phone</option>
                <option value="EMAIL">Email</option>
                <option value="TEXT">Text message</option>
              </select>
            </div>
            <div>
              <label htmlFor="street" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Street address *
              </label>
              <input id="street" className={inputClass} data-testid="np-street" {...register("street")} />
              {fieldError("street")}
            </div>
            <div>
              <label htmlFor="unit" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Unit / suite (optional)
              </label>
              <input id="unit" className={inputClass} {...register("unit")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                  City *
                </label>
                <input id="city" className={inputClass} data-testid="np-city" {...register("city")} />
                {fieldError("city")}
              </div>
              <div>
                <label htmlFor="state" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                  State *
                </label>
                <input id="state" className={inputClass} data-testid="np-state" {...register("state")} />
                {fieldError("state")}
              </div>
            </div>
            <div>
              <label htmlFor="zip" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                ZIP code *
              </label>
              <input id="zip" className={inputClass} data-testid="np-zip" {...register("zip")} />
              {fieldError("zip")}
            </div>
          </div>
        )}

        {/* Step 3 — Photos & notes */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-brand-ink dark:text-slate-200">Photos (optional)</p>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Photos help us understand the work. Add from your camera or library.
              </p>
              <PhotoUploader
                max={maxPhotos}
                maxMb={maxMb}
                onChange={(photos: PhotoMeta[]) => setValue("photos", photos, { shouldValidate: false })}
              />
            </div>
            <div>
              <label htmlFor="additionalNotes" className="text-sm font-medium text-brand-ink dark:text-slate-200">
                Anything else? (optional)
              </label>
              <textarea
                id="additionalNotes"
                rows={3}
                className={inputClass}
                {...register("additionalNotes")}
              />
            </div>
          </div>
        )}

        {serverError && (
          <p
            className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
            data-testid="np-error"
          >
            {serverError}
          </p>
        )}

        <div className="mt-8">
          {step < 2 ? (
            <button
              type="button"
              onClick={next}
              className="w-full rounded-full bg-brand-navy py-3 text-sm font-semibold text-white transition-transform active:scale-[0.99]"
              data-testid="np-next"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-red py-3 text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-60"
              data-testid="np-submit"
            >
              {isSubmitting ? "Sending…" : "Submit request"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
