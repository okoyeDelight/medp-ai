/**
 * Role-Based Data Separation — Provider Scope
 *
 * The "Live Stream to Provider" / Provider Dashboard surface is restricted to
 * CLINICAL data only. Providers must NEVER see account settings, auth data,
 * or private diary notes. This module is the single source of truth for
 * what a provider role is allowed to read, and it sanitizes any payload
 * before it leaves the patient app.
 */

/** Tables a provider session is allowed to query. */
export const PROVIDER_ALLOWED_TABLES = [
  "vitals_logs",
  "dose_logs",
  "safety_score_events",
  "health_safety_scores",
] as const;

export type ProviderAllowedTable = (typeof PROVIDER_ALLOWED_TABLES)[number];

/** Columns a provider may read per allowed table. */
export const PROVIDER_ALLOWED_COLUMNS: Record<ProviderAllowedTable, string[]> = {
  vitals_logs: [
    "id",
    "measured_at",
    "systolic",
    "diastolic",
    "pulse_bpm",
    "glucose_mgdl",
    "source",
    "signal_quality",
  ],
  dose_logs: [
    "id",
    "taken_at",
    "remedy_id",
    "remedy_name",
    "remedy_local_name",
    "dose",
    "feel",
  ],
  safety_score_events: ["id", "created_at", "category", "delta", "reason"],
  health_safety_scores: ["score", "wellness_points", "updated_at"],
};

/** Tables/fields explicitly forbidden for any provider-scoped surface. */
export const PROVIDER_FORBIDDEN_TABLES = [
  "profiles", // account settings, hmo IDs, contact, privacy flags
  "auth.users",
] as const;

/** Fields that are private to the patient (diary notes, free-text). */
export const PROVIDER_FORBIDDEN_FIELDS = [
  "notes",
  "email",
  "display_name",
  "hmo_member_id",
  "privacy_acknowledged_at",
  "user_id",
] as const;

export function assertProviderTable(table: string): asserts table is ProviderAllowedTable {
  if (!PROVIDER_ALLOWED_TABLES.includes(table as ProviderAllowedTable)) {
    throw new Error(
      `[providerScope] Provider role cannot query "${table}". Clinical data only.`,
    );
  }
}

/** Strip any forbidden fields from a row before sending to a provider. */
export function sanitizeForProvider<T extends Record<string, unknown>>(
  table: ProviderAllowedTable,
  row: T,
): Partial<T> {
  const allowed = new Set(PROVIDER_ALLOWED_COLUMNS[table]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!allowed.has(k)) continue;
    if ((PROVIDER_FORBIDDEN_FIELDS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Sanitize an array payload (e.g. for live-stream emission). */
export function sanitizeRowsForProvider<T extends Record<string, unknown>>(
  table: ProviderAllowedTable,
  rows: T[],
): Partial<T>[] {
  return rows.map((r) => sanitizeForProvider(table, r));
}
