import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/lib/auth";

export type HmoProvider = "Reliance Health" | "Avon HMO" | "AXA Mansard" | null;

export interface HealthProfile {
  display_name: string | null;
  active_conditions: string[];
  active_medications: string[];
  hmo_provider: HmoProvider;
  hmo_member_id: string | null;
  privacy_guard: boolean;
  privacy_acknowledged_at: string | null;
}

const EMPTY: HealthProfile = {
  display_name: null,
  active_conditions: [],
  active_medications: [],
  hmo_provider: null,
  hmo_member_id: null,
  privacy_guard: true,
  privacy_acknowledged_at: null,
};

export async function fetchHealthProfile(): Promise<HealthProfile> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, active_conditions, active_medications, hmo_provider, hmo_member_id, privacy_guard, privacy_acknowledged_at",
    )
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY;
  return {
    display_name: data.display_name ?? null,
    active_conditions: (data.active_conditions ?? []) as string[],
    active_medications: (data.active_medications ?? []) as string[],
    hmo_provider: (data.hmo_provider ?? null) as HmoProvider,
    hmo_member_id: data.hmo_member_id ?? null,
    privacy_guard: data.privacy_guard ?? true,
    privacy_acknowledged_at: data.privacy_acknowledged_at ?? null,
  };
}

export async function updateHealthProfile(patch: Partial<HealthProfile>): Promise<void> {
  const uid = await requireUserId();
  const { error } = await (supabase.from("profiles") as unknown as {
    update: (v: Partial<HealthProfile>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  })
    .update(patch)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function acknowledgePrivacy(): Promise<void> {
  await updateHealthProfile({ privacy_acknowledged_at: new Date().toISOString() });
}

/** Common Nigerian-relevant suggestions */
export const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes Type 2",
  "Gastritis / Ulcer",
  "Asthma",
  "Sickle Cell",
  "Malaria (recent)",
  "Pregnancy",
  "Kidney disease",
  "Liver disease",
  "Thyroid",
  "Anxiety / Depression",
  "Heart disease",
];

export const COMMON_MEDICATIONS = [
  "Metformin",
  "Amlodipine",
  "Lisinopril",
  "Losartan",
  "Atorvastatin",
  "Warfarin",
  "Aspirin",
  "Paracetamol",
  "Ibuprofen",
  "Salbutamol",
  "Insulin",
  "Hydroxyurea",
  "ACTs (artemether-lumefantrine)",
  "Omeprazole",
  "Ciprofloxacin",
  "Levothyroxine",
];
