const sensitiveKey = /(token|secret|password|authorization|api[-_]?key)/i;

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : redactSensitive(nested)
      ])
    );
  }
  return value;
}
