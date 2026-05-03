import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/lib/auth";

export type ScoreCategory =
  | "herb_check"
  | "vitals_sync"
  | "device_pair"
  | "interaction_detected"
  | "emergency_event"
  | "report_shared"
  | "manual";

export interface SafetyScore {
  score: number; // 0-100
  wellness_points: number;
  premium_discount_pct: number;
}

export interface ScoreEvent {
  id: string;
  delta: number;
  category: ScoreCategory;
  reason: string;
  created_at: string;
}

const DEFAULT: SafetyScore = { score: 70, wellness_points: 0, premium_discount_pct: 0 };

/** Tier the discount based on score. Capped at 12%. */
function discountFor(score: number, points: number): number {
  const base = Math.max(0, Math.min(8, (score - 60) * 0.2));
  const bonus = Math.min(4, points / 100);
  return Math.round((base + bonus) * 10) / 10;
}

export async function fetchSafetyScore(): Promise<SafetyScore> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("health_safety_scores")
    .select("score, wellness_points, premium_discount_pct")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Lazy-create on first read.
    const { error: insErr } = await supabase
      .from("health_safety_scores")
      .insert({ user_id: uid, ...DEFAULT });
    if (insErr) throw insErr;
    return DEFAULT;
  }
  return {
    score: data.score ?? 70,
    wellness_points: data.wellness_points ?? 0,
    premium_discount_pct: Number(data.premium_discount_pct ?? 0),
  };
}

export async function fetchScoreEvents(limit = 10): Promise<ScoreEvent[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from("safety_score_events")
    .select("id, delta, category, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ScoreEvent[];
}

/** Apply a delta + log an event. Clamps score to 0-100. */
export async function applyScoreDelta(
  delta: number,
  category: ScoreCategory,
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<SafetyScore> {
  const uid = await requireUserId();
  const current = await fetchSafetyScore();
  const newScore = Math.max(0, Math.min(100, current.score + delta));
  const pointsDelta = delta > 0 ? delta * 5 : 0;
  const newPoints = Math.max(0, current.wellness_points + pointsDelta);
  const newDiscount = discountFor(newScore, newPoints);

  const { error: upErr } = await supabase
    .from("health_safety_scores")
    .update({
      score: newScore,
      wellness_points: newPoints,
      premium_discount_pct: newDiscount,
      context: metadata as never,
    })
    .eq("user_id", uid);
  if (upErr) throw upErr;

  const { error: evErr } = await supabase
    .from("safety_score_events")
    .insert({ user_id: uid, delta, category, reason, metadata: metadata as never });
  if (evErr) throw evErr;

  return { score: newScore, wellness_points: newPoints, premium_discount_pct: newDiscount };
}

export function scoreTier(score: number): {
  label: string;
  tone: "safe" | "caution" | "danger";
} {
  if (score >= 85) return { label: "Excellent", tone: "safe" };
  if (score >= 70) return { label: "Stable", tone: "safe" };
  if (score >= 50) return { label: "Watchful", tone: "caution" };
  return { label: "At Risk", tone: "danger" };
}
