import { supabase } from "@/integrations/supabase/client";
import { ensureSession } from "@/lib/auth";
import type { Remedy } from "@/data/remedies";

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
  await ensureSession();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("No user session");

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
  return data.id;
}

export async function setFeel(logId: string, feel: Feel): Promise<void> {
  await ensureSession();
  const { error } = await supabase.from("dose_logs").update({ feel }).eq("id", logId);
  if (error) throw error;
}

export async function fetchLogs(limitDays = 30): Promise<DoseLog[]> {
  await ensureSession();
  const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("dose_logs")
    .select("id,remedy_id,remedy_name,remedy_local_name,remedy_emoji,dose,feel,taken_at")
    .gte("taken_at", since)
    .order("taken_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DoseLog[];
}

/** Count of consecutive days (ending today or yesterday) with at least one logged dose. */
export function streakFromLogs(logs: Pick<DoseLog, "taken_at">[]): number {
  if (logs.length === 0) return 0;
  const days = new Set(
    logs.map((l) => new Date(l.taken_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  // Allow streak to "start" today or yesterday so an early-morning visit still counts
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
