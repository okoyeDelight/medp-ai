// Pharma-Logic Intersection Engine.
// Cross-references three live data points: User profile (conditions+meds),
// Live biometrics (BP/BPM/glucose), and recent herbal compounds.

import type { HealthProfile } from "@/lib/healthProfile";
import type { DoseLog } from "@/lib/diary";
import { affectsHeartRate } from "@/lib/vitals";

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

/** Herbs known to interact with common orthodox medications. */
const HERB_DRUG_INTERACTIONS: Record<string, { drugs: string[]; risk: string }[]> = {
  ginger: [
    { drugs: ["Warfarin", "Aspirin"], risk: "increased bleeding risk (antiplatelet synergy)" },
  ],
  garlic: [
    { drugs: ["Warfarin", "Aspirin"], risk: "additive blood thinning" },
  ],
  bitterleaf: [
    { drugs: ["Metformin", "Insulin"], risk: "hypoglycemia (lowers blood sugar further)" },
  ],
  hibiscus: [
    { drugs: ["Amlodipine", "Lisinopril", "Losartan"], risk: "may amplify BP-lowering effect" },
    { drugs: ["Paracetamol"], risk: "altered absorption" },
  ],
  zobo: [
    { drugs: ["Amlodipine", "Lisinopril", "Losartan"], risk: "may amplify BP-lowering effect" },
  ],
  scentleaf: [
    { drugs: ["Warfarin"], risk: "vitamin-K interference" },
  ],
};

/** Conditions that make stimulant/cardioactive herbs particularly risky. */
const CONDITION_HERB_FLAGS: Record<string, string[]> = {
  Hypertension: ["ginger", "kola", "ephedra", "guarana", "yohimbe"],
  "Heart disease": ["kola", "ephedra", "guarana", "yohimbe", "ginger"],
  "Diabetes Type 2": ["bitterleaf"],
  Pregnancy: ["bitterleaf", "scentleaf", "dogonyaro"],
  "Liver disease": ["dogonyaro"],
  "Kidney disease": ["hibiscus", "zobo"],
};

export interface BiometricSnapshot {
  bpm: number | null;
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null;
}

export function runIntersectionCheck(
  profile: HealthProfile | null,
  bio: BiometricSnapshot,
  recentDoses: DoseLog[],
): IntersectionAlert {
  if (!profile) {
    return { tier: "ok", title: "All clear", detail: "No risk factors detected.", triggers: [] };
  }

  const conditions = profile.active_conditions ?? [];
  const meds = profile.active_medications ?? [];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = recentDoses.filter((d) => new Date(d.taken_at).getTime() >= dayAgo);

  // 1. CRITICAL: stimulant herb + high BPM + hypertension/heart condition.
  const cardiacCondition = conditions.find(
    (c) => c === "Hypertension" || c === "Heart disease",
  );
  const stimulantHerb = recent.find((d) => affectsHeartRate(d.remedy_id, d.remedy_name));
  const highBpm = (bio.bpm ?? 0) > 110;
  if (cardiacCondition && stimulantHerb && highBpm) {
    return {
      tier: "critical",
      title: "Critical System Override",
      detail: `Heart rate ${bio.bpm} BPM with ${stimulantHerb.remedy_name} active and existing ${cardiacCondition}. Stop herb intake and contact your doctor.`,
      triggers: [`HR ${bio.bpm} BPM`, stimulantHerb.remedy_name, cardiacCondition],
      herb: stimulantHerb.remedy_name,
      condition: cardiacCondition,
    };
  }

  // 2. CRITICAL: BP crisis.
  if ((bio.systolic ?? 0) >= 180 || (bio.diastolic ?? 0) >= 120) {
    return {
      tier: "critical",
      title: "Hypertensive Crisis Detected",
      detail: `BP ${bio.systolic}/${bio.diastolic} mmHg exceeds crisis threshold. Immediate referral suggested.`,
      triggers: [`BP ${bio.systolic}/${bio.diastolic}`],
    };
  }

  // 3. CAUTION: Direct herb-drug interactions.
  for (const dose of recent) {
    const profile = HERB_DRUG_INTERACTIONS[dose.remedy_id.toLowerCase()];
    if (!profile) continue;
    for (const inter of profile) {
      const conflict = inter.drugs.find((drug) =>
        meds.some((m) => m.toLowerCase().includes(drug.toLowerCase())),
      );
      if (conflict) {
        return {
          tier: "caution",
          title: "Herb-Drug Interaction",
          detail: `${dose.remedy_name} + ${conflict}: ${inter.risk}.`,
          triggers: [dose.remedy_name, conflict],
          herb: dose.remedy_name,
          medication: conflict,
        };
      }
    }
  }

  // 4. CAUTION: condition-flagged herb.
  for (const dose of recent) {
    for (const cond of conditions) {
      const flagged = CONDITION_HERB_FLAGS[cond];
      if (flagged?.includes(dose.remedy_id.toLowerCase())) {
        return {
          tier: "caution",
          title: "Condition-Sensitive Herb",
          detail: `${dose.remedy_name} is flagged for users with ${cond}. Monitor symptoms closely.`,
          triggers: [dose.remedy_name, cond],
          herb: dose.remedy_name,
          condition: cond,
        };
      }
    }
  }

  // 5. WATCH: borderline biometrics.
  if ((bio.systolic ?? 0) >= 140 || (bio.diastolic ?? 0) >= 90 || (bio.bpm ?? 0) > 100) {
    return {
      tier: "watch",
      title: "Elevated Vitals",
      detail: "Vitals are above normal but not critical. Keep an eye out.",
      triggers: bio.bpm ? [`HR ${bio.bpm} BPM`] : [`BP ${bio.systolic}/${bio.diastolic}`],
    };
  }

  return {
    tier: "ok",
    title: "All Clear",
    detail: "No interactions detected across your profile, vitals, and recent herbs.",
    triggers: [],
  };
}

export function tierColor(tier: IntersectionTier): {
  bg: string;
  border: string;
  text: string;
  badge: string;
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
