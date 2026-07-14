/**
 * Presentation helpers for the internal week calendar. The MVP treats the
 * server's local time as the company timezone (see DECISIONS.md — site-visit
 * times are combined in server-local time), so all day/time math here uses
 * local `Date` getters for consistency between an event's position and label.
 */

export interface EmployeeColor {
  dot: string;
  bg: string;
  border: string;
  text: string;
}

/** Distinct, accessible palette — one stable color per employee (by index). */
export const EMPLOYEE_COLORS: EmployeeColor[] = [
  { dot: "#0284c7", bg: "#e0f2fe", border: "#38bdf8", text: "#075985" }, // sky
  { dot: "#7c3aed", bg: "#ede9fe", border: "#a78bfa", text: "#5b21b6" }, // violet
  { dot: "#059669", bg: "#d1fae5", border: "#34d399", text: "#065f46" }, // emerald
  { dot: "#d97706", bg: "#fef3c7", border: "#fbbf24", text: "#92400e" }, // amber
  { dot: "#db2777", bg: "#fce7f3", border: "#f472b6", text: "#9d174d" }, // pink
  { dot: "#0d9488", bg: "#ccfbf1", border: "#2dd4bf", text: "#115e59" }, // teal
  { dot: "#4f46e5", bg: "#e0e7ff", border: "#818cf8", text: "#3730a3" }, // indigo
  { dot: "#ca8a04", bg: "#fef9c3", border: "#facc15", text: "#854d0e" }, // yellow
];

export const UNASSIGNED_COLOR: EmployeeColor = {
  dot: "#94a3b8",
  bg: "#f1f5f9",
  border: "#cbd5e1",
  text: "#334155",
};

export function colorForIndex(index: number): EmployeeColor {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
}

/** Local Sunday 00:00 of the week containing `d`. */
export function startOfWeekLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Local YYYY-MM-DD. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Minutes since local midnight. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
