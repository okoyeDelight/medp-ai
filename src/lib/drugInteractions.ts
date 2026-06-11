// Clinical Drug ↔ Herb Interaction lookup.
// Reads from local Supabase cache (drug_herb_interactions) — populated by
// the future Nightly ETL Pipeline (Source_API + Last_Synced_Date metadata).

import { supabase } from "@/integrations/supabase/client";

export type Severity = "severe" | "moderate" | "mild";

export interface DrugHerbInteraction {
  id: string;
  drug_name: string;
  herb_id: string;
  herb_name: string;
  severity: Severity;
  mechanism: string;
  clinical_advice: string;
  affected_systems: string[];
  source_api: string;
  citation: string | null;
  last_synced_at: string;
  verification_status: "pending" | "verified";
}

export async function searchDrugInteractions(
  drugName: string,
  herbIds: string[],
): Promise<DrugHerbInteraction[]> {
  const drug = drugName.trim();
  if (!drug) return [];
  let q = supabase
    .from("drug_herb_interactions" as any)
    .select("*")
    .ilike("drug_name", `%${drug}%`);
  if (herbIds.length > 0) q = q.in("herb_id", herbIds);
  const { data, error } = await q;
  if (error) {
    console.error("[drugInteractions] query failed", error);
    return [];
  }
  return ((data as unknown as DrugHerbInteraction[]) ?? []).sort(severityRank);
}

function severityRank(a: DrugHerbInteraction, b: DrugHerbInteraction) {
  const order: Record<Severity, number> = { severe: 0, moderate: 1, mild: 2 };
  return order[a.severity] - order[b.severity];
}

export function severityTokens(sev: Severity) {
  switch (sev) {
    case "severe":
      return {
        label: "SEVERE",
        ring: "ring-2 ring-[hsl(var(--danger))]",
        bg: "bg-[hsl(var(--danger)/0.08)]",
        badge: "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]",
        text: "text-[hsl(var(--danger))]",
      };
    case "moderate":
      return {
        label: "MODERATE",
        ring: "ring-2 ring-[hsl(var(--caution))]",
        bg: "bg-[hsl(var(--caution)/0.1)]",
        badge: "bg-[hsl(var(--caution))] text-[hsl(var(--caution-foreground))]",
        text: "text-[hsl(var(--caution-foreground))]",
      };
    default:
      return {
        label: "MILD / SAFE",
        ring: "ring-2 ring-[hsl(var(--safe))]",
        bg: "bg-[hsl(var(--safe)/0.08)]",
        badge: "bg-[hsl(var(--safe))] text-[hsl(var(--safe-foreground))]",
        text: "text-[hsl(var(--safe))]",
      };
  }
}

/** Preparation / dosage clinical reference for herbs we surface. */
export interface HerbalReference {
  herbId: string;
  herbName: string;
  maxDailyDose: string;
  extraction: "Infusion" | "Decoction" | "Tincture" | "Powder";
  toxicityWarnings: string[];
  notes: string;
  source: string;
}

export const HERBAL_REFERENCE: Record<string, HerbalReference> = {
  hibiscus: {
    herbId: "hibiscus",
    herbName: "Hibiscus / Zobo",
    maxDailyDose: "≤ 720 mL infusion / 24h (≈3 cups)",
    extraction: "Infusion",
    toxicityWarnings: [
      "Hepatotoxic at >2 g dried calyces/kg in animal models",
      "Hypotension risk with antihypertensives",
    ],
    notes: "Steep 2 g dried calyces in 200 mL water at 90 °C for 5 min. Avoid boiling.",
    source: "WHO Monograph Vol.2 / MedP-AI Clinical Database v1.2",
  },
  agbo: {
    herbId: "agbo",
    herbName: "Agbo (mixed infusion)",
    maxDailyDose: "Not standardised — discourage in cardiac/hepatic patients",
    extraction: "Decoction",
    toxicityWarnings: [
      "Variable botanical purity",
      "Reports of acute kidney injury and arrhythmia",
    ],
    notes: "No validated dose. Recommend cessation pending clinician review.",
    source: "PCN Reference Protocol §4.4",
  },
  ginger: {
    herbId: "ginger",
    herbName: "Ginger (Zingiber officinale)",
    maxDailyDose: "≤ 4 g dried rhizome / 24h",
    extraction: "Infusion",
    toxicityWarnings: [
      "Antiplatelet — bleeding risk",
      "GI irritation at high dose",
    ],
    notes: "Steep 1 g powdered rhizome in 150 mL water for 5 min.",
    source: "WHO Monograph Vol.1",
  },
  garlic: {
    herbId: "garlic",
    herbName: "Garlic (Allium sativum)",
    maxDailyDose: "≤ 4 g fresh / 24h",
    extraction: "Powder",
    toxicityWarnings: ["CYP2C9 inhibition", "Bleeding risk"],
    notes: "Crush fresh; do not exceed 4 g/day in patients on anticoagulants.",
    source: "MedP-AI Clinical Database v1.2",
  },
  bitterleaf: {
    herbId: "bitterleaf",
    herbName: "Bitter Leaf (Vernonia amygdalina)",
    maxDailyDose: "≤ 200 mL fresh juice / 24h",
    extraction: "Infusion",
    toxicityWarnings: ["Hypoglycaemia", "Hepatic strain at chronic high dose"],
    notes: "Macerate leaves; strain. Monitor capillary glucose.",
    source: "PubMed PMID 24299811",
  },
  scentleaf: {
    herbId: "scentleaf",
    herbName: "Scent Leaf (Ocimum gratissimum)",
    maxDailyDose: "≤ 6 g fresh leaves / 24h",
    extraction: "Infusion",
    toxicityWarnings: ["Variable vitamin-K content"],
    notes: "Steep 3 g fresh leaves in 200 mL hot water for 5 min.",
    source: "MedP-AI Clinical Database v1.2",
  },
  dogonyaro: {
    herbId: "dogonyaro",
    herbName: "Dogonyaro (Neem)",
    maxDailyDose: "≤ 50 mL decoction / 24h, short-course only",
    extraction: "Decoction",
    toxicityWarnings: ["Hepatotoxic with prolonged use", "Avoid in pregnancy"],
    notes: "Boil 5 g leaves in 250 mL water for 10 min; cap to 7-day course.",
    source: "WHO Traditional Medicine Strategy 2014-2023",
  },
};

export function referenceFor(herbId: string): HerbalReference | null {
  return HERBAL_REFERENCE[herbId.toLowerCase()] ?? null;
}

export const COMMON_DRUGS = [
  "Digoxin", "Warfarin", "Acetaminophen", "Ibuprofen", "Metformin", "Insulin",
  "Amlodipine", "Lisinopril", "Losartan", "Ciprofloxacin", "Aspirin", "Paracetamol",
];
