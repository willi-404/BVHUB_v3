type Details = Record<string, unknown>;

function redact(value: unknown, key = ""): unknown {
  if (/password|token/i.test(key)) return "[REDACTED]";
  if (typeof value === "string") return value.replace(/\bBearer\s+[^\s]+/gi, "Bearer [REDACTED]").replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[REDACTED]");
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

function write(level: "info" | "warn" | "error", event: string, details?: Details, error?: unknown): void {
  const payload: Record<string, unknown> = { timestamp: new Date().toISOString(), level, event };
  if (details) payload.details = redact(details);
  if (error) payload.error = redact({ message: error instanceof Error ? error.message : String(error) });
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Writes an informational structured log event. @param {string} event The stable event name. @param {Details} [details] Optional structured context. @returns {void} Nothing. */
export function logInfo(event: string, details?: Details): void { write("info", event, details); }
/** Writes a warning structured log event. @param {string} event The stable event name. @param {Details} [details] Optional structured context. @returns {void} Nothing. */
export function logWarn(event: string, details?: Details): void { write("warn", event, details); }
/** Writes an error structured log event with redacted error context. @param {string} event The stable event name. @param {unknown} error The thrown value. @param {Details} [details] Optional structured context. @returns {void} Nothing. */
export function logError(event: string, error: unknown, details?: Details): void { write("error", event, details, error); }

/** Redacts the local part of an email address for logs. @param {string} email The email address to redact. @returns {string} A privacy-preserving representation. */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "[REDACTED]";
  return `${local?.slice(0, 2) || "*"}***@${domain}`;
}
