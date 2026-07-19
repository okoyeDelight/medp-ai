// Safety score client shim. All mutations + discount formula live in the
// `safety-score` Edge Function (JWT-verified). This module only exposes
// async wrappers and a pure UI tier helper.

import { supabase } from "@/integrations/supabase/client";

export type ScoreCategory =
  | "herb_check" | "vitals_sync" | "device_pair"
  | "interaction_detected" | "emergency_event" | "report_shared" | "manual";

export interface SafetyScore {
  score: number;
  wellness_points: number;
  premium_discount_pct: number;
}
export interface ScoreEvent {
  id: string; delta: number; category: ScoreCategory;
  reason: string; created_at: string;
}

async function callEdge<T>(body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("safety-score", { body });
  if (error) throw new Error(error.message ?? "Safety score unavailable.");
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data as T;
}

export async function fetchSafetyScore(): Promise<SafetyScore> {
  return callEdge<SafetyScore>({ action: "get" });
}

export async function fetchScoreEvents(limit = 10): Promise<ScoreEvent[]> {
  const res = await callEdge<{ events: ScoreEvent[] }>({ action: "events", limit });
  return res.events ?? [];
}

export async function applyScoreDelta(
  delta: number,
  category: ScoreCategory,
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<SafetyScore> {
  return callEdge<SafetyScore>({
    action: "apply", delta, category, reason, metadata,
  });
}

export function scoreTier(score: number): {
  label: string; tone: "safe" | "caution" | "danger";
} {
  if (score >= 85) return { label: "Excellent", tone: "safe" };
  if (score >= 70) return { label: "Stable", tone: "safe" };
  if (score >= 50) return { label: "Watchful", tone: "caution" };
  return { label: "At Risk", tone: "danger" };
}
