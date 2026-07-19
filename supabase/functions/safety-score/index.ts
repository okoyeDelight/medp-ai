// Safety score read/mutate. JWT-verified. Server owns discount formula.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT = { score: 70, wellness_points: 0, premium_discount_pct: 0 };

function discountFor(score: number, points: number): number {
  const base = Math.max(0, Math.min(8, (score - 60) * 0.2));
  const bonus = Math.min(4, points / 100);
  return Math.round((base + bonus) * 10) / 10;
}

const CATEGORIES = [
  "herb_check", "vitals_sync", "device_pair", "interaction_detected",
  "emergency_event", "report_shared", "manual",
] as const;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get") }),
  z.object({ action: z.literal("events"), limit: z.number().int().min(1).max(100).default(10) }),
  z.object({
    action: z.literal("apply"),
    delta: z.number().int().min(-50).max(50),
    category: z.enum(CATEGORIES),
    reason: z.string().trim().min(1).max(200),
    metadata: z.record(z.unknown()).optional(),
  }),
]);

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
    const p = parsed.data;

    if (p.action === "get") {
      const { data, error } = await supabase
        .from("health_safety_scores")
        .select("score, wellness_points, premium_discount_pct")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) {
        const { error: insErr } = await supabase
          .from("health_safety_scores").insert({ user_id: uid, ...DEFAULT });
        if (insErr) return json({ error: insErr.message }, 500);
        return json(DEFAULT);
      }
      return json({
        score: data.score ?? 70,
        wellness_points: data.wellness_points ?? 0,
        premium_discount_pct: Number(data.premium_discount_pct ?? 0),
      });
    }

    if (p.action === "events") {
      const { data, error } = await supabase
        .from("safety_score_events")
        .select("id, delta, category, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(p.limit);
      if (error) return json({ error: error.message }, 500);
      return json({ events: data ?? [] });
    }

    // apply
    const { data: current } = await supabase
      .from("health_safety_scores")
      .select("score, wellness_points, premium_discount_pct")
      .eq("user_id", uid).maybeSingle();
    const cur = current ?? { ...DEFAULT };
    const newScore = Math.max(0, Math.min(100, (cur.score ?? 70) + p.delta));
    const pointsDelta = p.delta > 0 ? p.delta * 5 : 0;
    const newPoints = Math.max(0, (cur.wellness_points ?? 0) + pointsDelta);
    const newDiscount = discountFor(newScore, newPoints);

    if (!current) {
      const { error: insErr } = await supabase.from("health_safety_scores").insert({
        user_id: uid, score: newScore, wellness_points: newPoints,
        premium_discount_pct: newDiscount,
      });
      if (insErr) return json({ error: insErr.message }, 500);
    } else {
      const { error: upErr } = await supabase.from("health_safety_scores").update({
        score: newScore, wellness_points: newPoints, premium_discount_pct: newDiscount,
      }).eq("user_id", uid);
      if (upErr) return json({ error: upErr.message }, 500);
    }
    const { error: evErr } = await supabase.from("safety_score_events").insert({
      user_id: uid, delta: p.delta, category: p.category, reason: p.reason,
      metadata: (p.metadata ?? {}) as never,
    });
    if (evErr) return json({ error: evErr.message }, 500);

    return json({ score: newScore, wellness_points: newPoints, premium_discount_pct: newDiscount });
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
