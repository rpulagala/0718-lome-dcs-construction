/**
 * Business-hours helpers for the response SLA.
 * MVP definition: business hours accrue only on weekdays (Mon–Fri); weekend
 * hours do not count. See docs/DECISIONS.md.
 */
function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6; // 0=Sun, 6=Sat
}

/** Add `hours` business hours to `start`, skipping weekend hours. */
export function addBusinessHours(start: Date, hours: number): Date {
  const result = new Date(start);
  let remaining = Math.max(0, Math.floor(hours));
  while (remaining > 0) {
    result.setHours(result.getHours() + 1);
    if (isBusinessDay(result)) remaining--;
  }
  return result;
}

/** A request is overdue if it has not been contacted by its response due time. */
export function isOverdue(
  responseDueAt: Date | null | undefined,
  firstContactedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (firstContactedAt) return false;
  if (!responseDueAt) return false;
  return now.getTime() > responseDueAt.getTime();
}
