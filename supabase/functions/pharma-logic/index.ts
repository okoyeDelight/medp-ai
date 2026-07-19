// Pharma-Logic Intersection Engine. JWT-verified.
// Server-side proprietary rule engine — receives biometrics + recent doses,
// fetches user profile server-side, returns an IntersectionAlert.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HEART_AFFECTING = new Set([
  "ginger", "garlic", "lemongrass", "bitterleaf", "scentleaf",
  "kola", "ephedra", "guarana", "yohimbe", "hibiscus", "zobo",
]);

const HERB_DRUG_INTERACTIONS: Record<string, { drugs: string[]; risk: string }[]> = {
  ginger:     [{ drugs: ["Warfarin", "Aspirin"], risk: "increased bleeding risk (antiplatelet synergy)" }],
  garlic:     [{ drugs: ["Warfarin", "Aspirin"], risk: "additive blood thinning" }],
  bitterleaf: [{ drugs: ["Metformin", "Insulin"], risk: "hypoglycemia (lowers blood sugar further)" }],
  hibiscus:   [
    { drugs: ["Amlodipine", "Lisinopril", "Losartan"], risk: "may amplify BP-lowering effect" },
    { drugs: ["Paracetamol"], risk: "altered absorption" },
  ],
  zobo:       [{ drugs: ["Amlodipine", "Lisinopril", "Losartan"], risk: "may amplify BP-lowering effect" }],
  scentleaf:  [{ drugs: ["Warfarin"], risk: "vitamin-K interference" }],
};

const CONDITION_HERB_FLAGS: Record<string, string[]> = {
  Hypertension: ["ginger", "kola", "ephedra", "guarana", "yohimbe"],
  "Heart disease": ["kola", "ephedra", "guarana", "yohimbe", "ginger"],
  "Diabetes Type 2": ["bitterleaf"],
  Pregnancy: ["bitterleaf", "scentleaf", "dogonyaro"],
  "Liver disease": ["dogonyaro"],
  "Kidney disease": ["hibiscus", "zobo"],
};

function affectsHeartRate(id: string, name?: string): boolean {
  const rid = id.toLowerCase();
  if (HEART_AFFECTING.has(rid)) return true;
  const rn = (name ?? "").toLowerCase();
  for (const k of HEART_AFFECTING) if (rid.includes(k) || rn.includes(k)) return true;
  return false;
}

const DoseSchema = z.object({
  remedy_id: z.string().trim().min(1).max(64),
  remedy_name: z.string().trim().min(1).max(120),
  taken_at: z.string().datetime(),
});
const Body = z.object({
  biometrics: z.object({
    bpm: z.number().finite().nullable(),
    systolic: z.number().finite().nullable(),
    diastolic: z.number().finite().nullable(),
    glucose: z.number().finite().nullable(),
  }),
  recentDoses: z.array(DoseSchema).max(200).default([]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { biometrics: bio, recentDoses } = parsed.data;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("active_conditions, active_medications")
      .eq("user_id", uid)
      .maybeSingle();

    const conditions: string[] = profileRow?.active_conditions ?? [];
    const meds: string[] = profileRow?.active_medications ?? [];

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = recentDoses.filter((d) => new Date(d.taken_at).getTime() >= dayAgo);

    // 1. CRITICAL: stimulant herb + high BPM + cardiac condition.
    const cardiacCondition = conditions.find(
      (c) => c === "Hypertension" || c === "Heart disease",
    );
    const stimulantHerb = recent.find((d) => affectsHeartRate(d.remedy_id, d.remedy_name));
    if (cardiacCondition && stimulantHerb && (bio.bpm ?? 0) > 110) {
      return json({
        tier: "critical",
        title: "Critical System Override",
        detail: `Heart rate ${bio.bpm} BPM with ${stimulantHerb.remedy_name} active and existing ${cardiacCondition}. Stop herb intake and contact your doctor.`,
        triggers: [`HR ${bio.bpm} BPM`, stimulantHerb.remedy_name, cardiacCondition],
        herb: stimulantHerb.remedy_name,
        condition: cardiacCondition,
      });
    }
    // 2. CRITICAL: BP crisis.
    if ((bio.systolic ?? 0) >= 180 || (bio.diastolic ?? 0) >= 120) {
      return json({
        tier: "critical",
        title: "Hypertensive Crisis Detected",
        detail: `BP ${bio.systolic}/${bio.diastolic} mmHg exceeds crisis threshold. Immediate referral suggested.`,
        triggers: [`BP ${bio.systolic}/${bio.diastolic}`],
      });
    }
    // 3. CAUTION: direct herb-drug interactions.
    for (const dose of recent) {
      const profile = HERB_DRUG_INTERACTIONS[dose.remedy_id.toLowerCase()];
      if (!profile) continue;
      for (const inter of profile) {
        const conflict = inter.drugs.find((drug) =>
          meds.some((m) => m.toLowerCase().includes(drug.toLowerCase())),
        );
        if (conflict) {
          return json({
            tier: "caution",
            title: "Herb-Drug Interaction",
            detail: `${dose.remedy_name} + ${conflict}: ${inter.risk}.`,
            triggers: [dose.remedy_name, conflict],
            herb: dose.remedy_name,
            medication: conflict,
          });
        }
      }
    }
    // 4. CAUTION: condition-flagged herb.
    for (const dose of recent) {
      for (const cond of conditions) {
        const flagged = CONDITION_HERB_FLAGS[cond];
        if (flagged?.includes(dose.remedy_id.toLowerCase())) {
          return json({
            tier: "caution",
            title: "Condition-Sensitive Herb",
            detail: `${dose.remedy_name} is flagged for users with ${cond}. Monitor symptoms closely.`,
            triggers: [dose.remedy_name, cond],
            herb: dose.remedy_name,
            condition: cond,
          });
        }
      }
    }
    // 5. WATCH: borderline biometrics.
    if ((bio.systolic ?? 0) >= 140 || (bio.diastolic ?? 0) >= 90 || (bio.bpm ?? 0) > 100) {
      return json({
        tier: "watch",
        title: "Elevated Vitals",
        detail: "Vitals are above normal but not critical. Keep an eye out.",
        triggers: bio.bpm ? [`HR ${bio.bpm} BPM`] : [`BP ${bio.systolic}/${bio.diastolic}`],
      });
    }
    return json({ tier: "ok", title: "All Clear", detail: "No interactions detected.", triggers: [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
