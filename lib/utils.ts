import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { env } from "@/lib/env"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date/time in the configured company timezone. */
export function formatInCompanyTz(
  d: Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: env.COMPANY_TIMEZONE, ...opts }).format(d)
}
