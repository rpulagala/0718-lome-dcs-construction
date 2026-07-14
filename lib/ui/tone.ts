/**
 * Light per-section color tones for the request detail page, so each card is
 * easy to tell apart at a glance. Light shades of blue / green / gray / orange.
 */
export type SectionTone = "blue" | "green" | "gray" | "orange";

export const sectionTone: Record<SectionTone, string> = {
  blue: "border-blue-200 bg-blue-50",
  green: "border-emerald-200 bg-emerald-50",
  gray: "border-slate-300 bg-slate-50",
  orange: "border-orange-200 bg-orange-50",
};
