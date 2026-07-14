"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import {
  workRequestSchema,
  workRequestDefaults,
  type PhotoMeta,
} from "@/lib/validation/workRequest";

type FormInput = z.input<typeof workRequestSchema>;
type FormOutput = z.output<typeof workRequestSchema>;
import { submitWorkRequest } from "@/app/request/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUploader } from "./PhotoUploader";

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  maxPhotos: number;
  maxMb: number;
}

export function WorkRequestForm({ categories, maxPhotos, maxMb }: Props) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(workRequestSchema),
    defaultValues: { ...workRequestDefaults, idempotencyKey, photos: [] },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const err = (name: keyof FormInput) =>
    errors[name]?.message as string | undefined;

  async function onValid(values: FormOutput) {
    setServerError(null);
    const res = await submitWorkRequest(values);
    if (res.ok && res.requestNumber) {
      router.push(`/request/confirmation/${res.requestNumber}`);
      return;
    }
    if (res.fieldErrors) {
      for (const [name, message] of Object.entries(res.fieldErrors)) {
        setError(name as keyof FormInput, { message });
      }
    }
    setServerError(res.error ?? "Submission failed. Please try again.");
  }

  function onPhotosChange(photos: PhotoMeta[]) {
    setValue("photos", photos, { shouldValidate: false });
  }

  const fieldError = (name: keyof FormInput) =>
    err(name) ? (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {err(name)}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      className="brand-form space-y-10 font-brand text-brand-ink"
      data-testid="work-request-form"
      noValidate
    >
      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="border-b border-slate-200 pb-2 text-2xl font-light tracking-wide text-brand-ink">
          Your contact information
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" data-testid="f-fullName" {...register("fullName")} />
            {fieldError("fullName")}
          </div>
          <div>
            <Label htmlFor="phone">Phone number *</Label>
            <Input id="phone" data-testid="f-phone" {...register("phone")} />
            {fieldError("phone")}
          </div>
          <div>
            <Label htmlFor="email">Email address *</Label>
            <Input id="email" type="email" data-testid="f-email" {...register("email")} />
            {fieldError("email")}
          </div>
          <div>
            <Label htmlFor="preferredContact">Preferred contact method *</Label>
            <select
              id="preferredContact"
              data-testid="f-preferredContact"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...register("preferredContact")}
            >
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
              <option value="TEXT">Text message</option>
            </select>
            {fieldError("preferredContact")}
          </div>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="border-b border-slate-200 pb-2 text-2xl font-light tracking-wide text-brand-ink">
          Project location
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="street">Street address *</Label>
            <Input id="street" data-testid="f-street" {...register("street")} />
            {fieldError("street")}
          </div>
          <div>
            <Label htmlFor="unit">Unit / suite</Label>
            <Input id="unit" data-testid="f-unit" {...register("unit")} />
            {fieldError("unit")}
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" data-testid="f-city" {...register("city")} />
            {fieldError("city")}
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input id="state" data-testid="f-state" {...register("state")} />
            {fieldError("state")}
          </div>
          <div>
            <Label htmlFor="zip">ZIP code *</Label>
            <Input id="zip" data-testid="f-zip" {...register("zip")} />
            {fieldError("zip")}
          </div>
        </div>
      </fieldset>

      {/* Project */}
      <fieldset className="space-y-4">
        <legend className="border-b border-slate-200 pb-2 text-2xl font-light tracking-wide text-brand-ink">
          About your project
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="categoryId">Project category *</Label>
            <select
              id="categoryId"
              data-testid="f-categoryId"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              defaultValue=""
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
            <Label htmlFor="budgetRange">Estimated budget range</Label>
            <Input id="budgetRange" data-testid="f-budgetRange" {...register("budgetRange")} />
            {fieldError("budgetRange")}
          </div>
          <div>
            <Label htmlFor="desiredTimeframe">Desired start timeframe</Label>
            <Input id="desiredTimeframe" {...register("desiredTimeframe")} />
          </div>
          <div>
            <Label htmlFor="preferredVisitDates">Preferred site-visit dates</Label>
            <Input id="preferredVisitDates" {...register("preferredVisitDates")} />
          </div>
          <div>
            <Label htmlFor="referralSource">How did you hear about us?</Label>
            <Input id="referralSource" {...register("referralSource")} />
          </div>
        </div>
        <div>
          <Label htmlFor="description">Tell us about your project *</Label>
          <Textarea
            id="description"
            rows={5}
            data-testid="f-description"
            {...register("description")}
          />
          {fieldError("description")}
        </div>
        <div>
          <Label htmlFor="additionalNotes">Additional notes</Label>
          <Textarea id="additionalNotes" rows={3} {...register("additionalNotes")} />
        </div>
      </fieldset>

      {/* Photos */}
      <fieldset className="space-y-3">
        <legend className="border-b border-slate-200 pb-2 text-2xl font-light tracking-wide text-brand-ink">
          Project photos
        </legend>
        <p className="text-sm text-slate-500">
          Optional, but photos help us understand the work. You can add them from
          your camera or photo library.
        </p>
        <PhotoUploader max={maxPhotos} maxMb={maxMb} onChange={onPhotosChange} />
      </fieldset>

      {/* Consent */}
      <fieldset className="space-y-3">
        <legend className="border-b border-slate-200 pb-2 text-2xl font-light tracking-wide text-brand-ink">
          Permissions
        </legend>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            data-testid="f-permission"
            {...register("permissionToContact")}
          />
          <span>I give DCS Construction permission to contact me about this request. *</span>
        </label>
        {fieldError("permissionToContact")}
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            data-testid="f-consent"
            {...register("consentAccepted")}
          />
          <span>
            I have read and accept the privacy policy and consent to my
            information being used to process this request. *
          </span>
        </label>
        {fieldError("consentAccepted")}
      </fieldset>

      {serverError && (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          data-testid="submit-error"
        >
          {serverError}
        </p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="submit-request"
          className="rounded-full bg-brand-red px-10 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-red-dark disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
