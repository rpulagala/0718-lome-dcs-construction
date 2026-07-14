/**
 * Centralized environment access with safe defaults.
 * Server-only values are read lazily; do not import into client components.
 */
function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  COMPANY_TIMEZONE: process.env.COMPANY_TIMEZONE ?? "America/Los_Angeles",

  EMAIL_MODE: (process.env.EMAIL_MODE ?? "log") as "log" | "resend",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  EMAIL_FROM:
    process.env.EMAIL_FROM ?? "DCS Construction <noreply@example.com>",
  INTAKE_NOTIFY_EMAILS: list(process.env.INTAKE_NOTIFY_EMAILS),

  BLOB_MODE: (process.env.BLOB_MODE ?? "local") as "local" | "vercel",
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ?? "",

  MAX_UPLOAD_FILES: Number(process.env.MAX_UPLOAD_FILES ?? "10"),
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB ?? "10"),
} as const;

export type Env = typeof env;
