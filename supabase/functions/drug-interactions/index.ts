// Drug ↔ Herb interaction lookup. JWT-verified.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  drug_name: z.string().trim().min(1).max(100),
  herb_ids: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const { drug_name, herb_ids } = parsed.data;
    let q = supabase
      .from("drug_herb_interactions")
      .select("*")
      .ilike("drug_name", `%${drug_name.replace(/[%_]/g, "")}%`);
    if (herb_ids.length > 0) q = q.in("herb_id", herb_ids);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const order: Record<string, number> = { severe: 0, moderate: 1, mild: 2 };
    const results = (data ?? []).sort(
      (a: any, b: any) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9),
    );
    return json({ results });
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
