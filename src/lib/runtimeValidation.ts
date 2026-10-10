/** Parse untrusted provider responses without unsafe 'any' casts. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function errorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim()) return value.message;
  if (isRecord(value) && typeof value.message === "string" && value.message.trim()) return value.message;
  return fallback;
}

export function edgeErrorMessage(value: unknown): string | null {
  if (!isRecord(value) || !Object.hasOwn(value, "error") || value.error == null) return null;
  // Never expose raw objects or server exception dumps to patients.
  return "External healthcare service returned an error; no result can be trusted.";
}
