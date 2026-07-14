import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { env } from "@/lib/env"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a decimal-like value as USD, e.g. "12500" -> "$12,500.00". Returns "—" for null. */
export function formatMoney(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value.toString());
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/** Format a date/time in the configured company timezone. */
export function formatInCompanyTz(
  d: Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: env.COMPANY_TIMEZONE, ...opts }).format(d)
}
