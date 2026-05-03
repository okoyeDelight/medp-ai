import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/lib/auth";
import type { Remedy } from "@/data/remedies";
import { applyScoreDelta } from "@/lib/safetyScore";

export type Feel = "better" | "same" | "worse";

export interface DoseLog {
  id: string;
  remedy_id: string;
  remedy_name: string;
  remedy_local_name: string;
  remedy_emoji: string;
  dose: string;
  feel: Feel | null;
  taken_at: string;
}

export async function logDose(remedy: Remedy): Promise<string> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("dose_logs")
    .insert({
      user_id: userId,
      remedy_id: remedy.id,
      remedy_name: remedy.name,
      remedy_local_name: remedy.localName,
      remedy_emoji: remedy.emoji,
      dose: remedy.dose,
    })
    .select("id")
    .single();

  if (error) throw error;
  // Bump safety score for proactive logging.
  applyScoreDelta(1, "herb_check", `Logged ${remedy.name}`).catch(() => {});
  return data.id;
}

export async function setFeel(logId: string, feel: Feel): Promise<void> {
  await requireUserId();
  const { error } = await supabase.from("dose_logs").update({ feel }).eq("id", logId);
  if (error) throw error;
}

export async function fetchLogs(limitDays = 30): Promise<DoseLog[]> {
  await requireUserId();
  const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("dose_logs")
    .select("id,remedy_id,remedy_name,remedy_local_name,remedy_emoji,dose,feel,taken_at")
    .gte("taken_at", since)
    .order("taken_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DoseLog[];
}

export function streakFromLogs(logs: Pick<DoseLog, "taken_at">[]): number {
  if (logs.length === 0) return 0;
  const days = new Set(
    logs.map((l) => new Date(l.taken_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  let cursor = new Date(today);

  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(today.getTime() - dayMs);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}
