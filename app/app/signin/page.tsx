"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalSignIn() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/portal/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setStep("code");
      // Demo mode (no email provider wired): the code comes back so we can
      // show + prefill it. Absent once real email is configured.
      if (typeof data.devCode === "string") {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
    } else {
      setError("Please enter a valid email address.");
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/portal/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.ok) {
      router.replace("/app");
      router.refresh();
    } else {
      setError(data.error ?? "Invalid code.");
    }
  }

  const input =
    "mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-brand-navy";
  const button =
    "h-12 w-full rounded-xl bg-brand-navy text-base font-semibold text-white transition-colors hover:bg-brand-navy-dark disabled:opacity-50";

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-6 pb-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-lg font-bold tracking-[0.15em] text-white">
          DCS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-ink">DCS Construction</h1>
        <p className="mt-1 text-sm text-slate-500">Track your projects, estimates, and messages.</p>
      </div>

      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) requestCode();
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="portal-email"
              className={input}
            />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !email} data-testid="portal-request-code" className={button}>
            {busy ? "Sending…" : "Continue"}
          </button>
          <p className="text-center text-xs text-slate-400">
            We&rsquo;ll email you a 6-digit code — no password needed.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) verify();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600">
            Enter the 6-digit code we sent to <span className="font-medium text-slate-900">{email}</span>.
          </p>
          {devCode && (
            <p
              className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
              data-testid="portal-dev-code"
            >
              Demo mode (email not configured): your code is{" "}
              <span className="font-semibold tracking-widest">{devCode}</span> — prefilled below.
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            data-testid="portal-code"
            className="h-14 w-full rounded-xl border border-slate-300 bg-white text-center text-2xl tracking-[0.5em] outline-none focus:border-brand-navy"
          />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6} data-testid="portal-verify" className={button}>
            {busy ? "Verifying…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setDevCode(null); setError(null); }}
            className="h-10 w-full text-sm font-medium text-slate-500"
          >
            ← Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
