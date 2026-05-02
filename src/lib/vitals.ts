import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/lib/auth";

export interface VitalsLog {
  id: string;
  pulse_bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose_mgdl: number | null;
  signal_quality: string | null;
  source: string;
  notes: string | null;
  measured_at: string;
}

export interface NewVitals {
  pulse_bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose_mgdl?: number | null;
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
      glucose_mgdl: v.glucose_mgdl ?? null,
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
    .select("id,pulse_bpm,systolic,diastolic,glucose_mgdl,signal_quality,source,notes,measured_at")
    .gte("measured_at", since)
    .order("measured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VitalsLog[];
}

/** Glucose category (fasting reference). */
export function glucoseCategory(g: number | null): {
  label: string;
  tone: "safe" | "caution" | "danger" | "muted";
} {
  if (g == null) return { label: "—", tone: "muted" };
  if (g >= 200) return { label: "Hyperglycemia", tone: "danger" };
  if (g >= 126) return { label: "Diabetic", tone: "danger" };
  if (g >= 100) return { label: "Pre-diabetic", tone: "caution" };
  if (g < 70) return { label: "Hypoglycemia", tone: "danger" };
  return { label: "Normal", tone: "safe" };
}

/** Heart-rate-affecting herbs (stimulant or cardioactive). */
export const HEART_AFFECTING_HERBS = new Set<string>([
  "ginger",
  "garlic",
  "lemongrass",
  "bitterleaf",
  "scentleaf",
  "kola",
  "ephedra",
  "guarana",
  "yohimbe",
  "hibiscus",
  "zobo",
]);

export function affectsHeartRate(remedyId: string, remedyName?: string): boolean {
  const id = remedyId.toLowerCase();
  if (HEART_AFFECTING_HERBS.has(id)) return true;
  const name = (remedyName ?? "").toLowerCase();
  for (const k of HEART_AFFECTING_HERBS) {
    if (id.includes(k) || name.includes(k)) return true;
  }
  return false;
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
