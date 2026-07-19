// Pharma-Logic Intersection Engine — client shim.
// The rule engine runs server-side in the `pharma-logic` Edge Function
// (JWT-verified, Zod-validated). This module exposes an async wrapper and
// UI colour tokens only.

import { supabase } from "@/integrations/supabase/client";
import type { DoseLog } from "@/lib/diary";

export type IntersectionTier = "ok" | "watch" | "caution" | "critical";

export interface IntersectionAlert {
  tier: IntersectionTier;
  title: string;
  detail: string;
  triggers: string[];
  herb?: string;
  condition?: string;
  medication?: string;
}

export interface BiometricSnapshot {
  bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
}

export const OK_ALERT: IntersectionAlert = {
  tier: "ok",
  title: "All Clear",
  detail: "No interactions detected.",
  triggers: [],
};

export async function runIntersectionCheck(
  bio: BiometricSnapshot,
  recentDoses: DoseLog[],
): Promise<IntersectionAlert> {
  const payload = {
    biometrics: {
      bpm: bio.bpm ?? null,
      systolic: bio.systolic ?? null,
      diastolic: bio.diastolic ?? null,
      glucose: bio.glucose ?? null,
    },
    recentDoses: (recentDoses ?? []).slice(0, 200).map((d) => ({
      remedy_id: String(d.remedy_id ?? ""),
      remedy_name: String(d.remedy_name ?? ""),
      taken_at: new Date(d.taken_at).toISOString(),
    })),
  };
  const { data, error } = await supabase.functions.invoke("pharma-logic", { body: payload });
  if (error) throw new Error(error.message ?? "Safety engine unavailable.");
  if ((data as any)?.error) throw new Error(String((data as any).error));
  return data as IntersectionAlert;
}

export function tierColor(tier: IntersectionTier): {
  bg: string; border: string; text: string; badge: string;
} {
  switch (tier) {
    case "critical":
      return {
        bg: "bg-[hsl(var(--danger)/0.08)]",
        border: "border-[hsl(var(--danger))]",
        text: "text-[hsl(var(--danger))]",
        badge: "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]",
      };
    case "caution":
      return {
        bg: "bg-[hsl(var(--caution)/0.1)]",
        border: "border-[hsl(var(--caution))]",
        text: "text-[hsl(var(--caution-foreground))]",
        badge: "bg-[hsl(var(--caution))] text-[hsl(var(--caution-foreground))]",
      };
    case "watch":
      return {
        bg: "bg-[hsl(var(--accent)/0.1)]",
        border: "border-[hsl(var(--accent))]",
        text: "text-[hsl(var(--accent-foreground))]",
        badge: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
      };
    default:
      return {
        bg: "bg-[hsl(var(--safe)/0.08)]",
        border: "border-[hsl(var(--safe))]",
        text: "text-[hsl(var(--safe))]",
        badge: "bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]",
      };
  }
}
