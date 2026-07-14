/**
 * Calendar integration boundary (Google / Outlook).
 *
 * MVP: this is an interface *seam* only — it does not talk to any external
 * calendar. It produces a standards-compliant iCalendar (.ics) payload so an
 * employee can add a visit to their own calendar, and defines the async
 * `CalendarProvider` contract that a real Google/Outlook sync would implement
 * later. Nothing here blocks scheduling. See docs/DECISIONS.md.
 */
import { formatInCompanyTz } from "@/lib/utils";

export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}

export interface CalendarProvider {
  name: string;
  /** Push an event to the external calendar; returns an external event id. */
  upsertEvent(event: CalendarEvent): Promise<{ externalId: string } | null>;
  removeEvent(externalId: string): Promise<void>;
}

/** Format a Date as an iCal UTC timestamp (YYYYMMDDTHHMMSSZ). */
function toICalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICal(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Build a downloadable .ics document for a single event. */
export function buildICalEvent(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DCS Construction//Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toICalUtc(new Date())}`,
    `DTSTART:${toICalUtc(event.start)}`,
    `DTEND:${toICalUtc(event.end)}`,
    `SUMMARY:${escapeICal(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeICal(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeICal(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/**
 * No-op provider used in the MVP. A future Google/Outlook provider would be
 * swapped in here without changing scheduling call sites.
 */
export const noopCalendarProvider: CalendarProvider = {
  name: "none",
  async upsertEvent() {
    return null;
  },
  async removeEvent() {
    // no-op
  },
};

/** Human-readable one-line summary of an event window. */
export function describeEventWindow(start: Date, end: Date): string {
  return `${formatInCompanyTz(start)} – ${formatInCompanyTz(end, { timeStyle: "short" })}`;
}
