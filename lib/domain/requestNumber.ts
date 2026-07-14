/**
 * Human-readable request number formatting: DCS-YYYY-NNNNNN.
 * The sequence is allocated transactionally in the DB (RequestCounter);
 * this module only handles formatting/parsing so it can be unit-tested.
 */
const PREFIX = "DCS";
const PAD = 6;

export function formatRequestNumber(year: number, seq: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error(`Invalid year: ${year}`);
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Invalid sequence: ${seq}`);
  }
  return `${PREFIX}-${year}-${String(seq).padStart(PAD, "0")}`;
}

export function parseRequestNumber(
  value: string,
): { year: number; seq: number } | null {
  const m = /^DCS-(\d{4})-(\d{6,})$/.exec(value.trim());
  if (!m) return null;
  return { year: Number(m[1]), seq: Number(m[2]) };
}

/** Estimate numbers share the format with an EST prefix. */
export function formatEstimateNumber(year: number, seq: number): string {
  return formatRequestNumber(year, seq).replace(PREFIX, "EST");
}
