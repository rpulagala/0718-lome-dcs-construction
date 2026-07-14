/**
 * Pure scheduling helpers for site visits.
 *
 * A site visit has a required start (`scheduledDate`) and an optional `endTime`.
 * When no end time is given we assume a default duration so two visits for the
 * same employee can still be checked for overlap (double-booking guard). See
 * docs/DECISIONS.md.
 */
import type { AppointmentStatus } from "@/lib/generated/prisma/enums";

/** Default visit length (minutes) when no explicit end time is supplied. */
export const DEFAULT_VISIT_MINUTES = 60;

export interface VisitWindow {
  start: Date;
  end: Date;
}

/** Appointment statuses that still occupy a slot for conflict purposes. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "PROPOSED",
  "CONFIRMED",
  "RESCHEDULED",
] as const;

export function isActiveAppointment(status: AppointmentStatus): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status);
}

/** Resolve the [start, end) window for a visit, applying the default duration. */
export function visitWindow(
  scheduledDate: Date,
  endTime: Date | null | undefined,
  defaultMinutes: number = DEFAULT_VISIT_MINUTES,
): VisitWindow {
  const start = new Date(scheduledDate);
  const end =
    endTime && endTime.getTime() > start.getTime()
      ? new Date(endTime)
      : new Date(start.getTime() + defaultMinutes * 60_000);
  return { start, end };
}

/** True if two half-open windows [start, end) overlap. */
export function rangesOverlap(a: VisitWindow, b: VisitWindow): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/**
 * Combine a `YYYY-MM-DD` date with an optional `HH:MM` time into a Date.
 * Interpreted in the server's local time; the MVP treats the server tz as the
 * company tz (see docs/DECISIONS.md). Returns null for an unparseable date.
 */
export function combineDateTime(
  dateStr: string,
  timeStr?: string | null,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dateMatch) return null;
  const [, y, m, d] = dateMatch;
  let hours = 0;
  let minutes = 0;
  if (timeStr && timeStr.trim()) {
    const t = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
    if (!t) return null;
    hours = Number(t[1]);
    minutes = Number(t[2]);
    if (hours > 23 || minutes > 59) return null;
  }
  const result = new Date(Number(y), Number(m) - 1, Number(d), hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}
