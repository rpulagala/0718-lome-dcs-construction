/**
 * Minimal structured JSON logger with correlation-id support.
 * Never log secrets, tokens, session cookies, or file contents (see docs/SECURITY.md).
 */
type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
  correlationId?: string;
}

function emit(level: Level, message: string, fields: LogFields = {}) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};

/** Generate a correlation id for a request. */
export function newCorrelationId(): string {
  return crypto.randomUUID();
}
