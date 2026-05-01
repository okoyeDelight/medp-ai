import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/lib/auth";

export interface VitalsLog {
  id: string;
  pulse_bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  signal_quality: string | null;
  source: string;
  notes: string | null;
  measured_at: string;
}

export interface NewVitals {
  pulse_bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  signal_quality?: string | null;
  source?: string;
  notes?: string | null;
}

export async function logVitals(v: NewVitals): Promise<string> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("vitals_logs")
    .insert({
      user_id: userId,
      pulse_bpm: v.pulse_bpm,
      systolic: v.systolic,
      diastolic: v.diastolic,
      signal_quality: v.signal_quality ?? null,
      source: v.source ?? "camera",
      notes: v.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function fetchVitals(limitDays = 90): Promise<VitalsLog[]> {
  await requireUserId();
  const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("vitals_logs")
    .select("id,pulse_bpm,systolic,diastolic,signal_quality,source,notes,measured_at")
    .gte("measured_at", since)
    .order("measured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VitalsLog[];
}

export async function deleteVitals(id: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase.from("vitals_logs").delete().eq("id", id);
  if (error) throw error;
}

/** Pretty BP category for UI badges. */
export function bpCategory(sys: number | null, dia: number | null): {
  label: string;
  tone: "safe" | "caution" | "danger" | "muted";
} {
  if (sys == null || dia == null) return { label: "—", tone: "muted" };
  if (sys >= 180 || dia >= 120) return { label: "Crisis", tone: "danger" };
  if (sys >= 140 || dia >= 90) return { label: "Stage 2 HBP", tone: "danger" };
  if (sys >= 130 || dia >= 80) return { label: "Stage 1 HBP", tone: "caution" };
  if (sys >= 120) return { label: "Elevated", tone: "caution" };
  if (sys < 90 || dia < 60) return { label: "Low", tone: "caution" };
  return { label: "Normal", tone: "safe" };
}
