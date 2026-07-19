// Consultation session lifecycle. JWT-verified. Server owns PIN generation.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PIN_TTL_MS = 2 * 60 * 60 * 1000;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("heartbeat"), session_id: z.string().uuid() }),
  z.object({ action: z.literal("terminate"), session_id: z.string().uuid() }),
  z.object({ action: z.literal("terminate_if_stale"), session_id: z.string().uuid() }),
]);

function rand4(): string {
  // Cryptographically random 4-digit PIN via Web Crypto.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(1000 + (buf[0] % 9000));
}

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

    if (p.action === "start") {
      const { data: hosp, error: hErr } = await supabase
        .from("hospitals").select("id")
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (hErr || !hosp) return json({ error: "No hospital available." }, 400);

      const now = new Date();
      const expires = new Date(now.getTime() + PIN_TTL_MS);
      const { data, error } = await supabase
        .from("consultation_sessions")
        .insert({
          patient_id: uid,
          hospital_id: hosp.id,
          pin: rand4(),
          pin_expires_at: expires.toISOString(),
          ends_at: expires.toISOString(),
          last_heartbeat: now.toISOString(),
          status: "active",
        })
        .select("*").single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (p.action === "heartbeat") {
      const { error } = await supabase.rpc("patient_heartbeat", { _session_id: p.session_id });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (p.action === "terminate") {
      const { error } = await supabase
        .from("consultation_sessions")
        .update({ status: "terminated", pin: null, revoked_at: new Date().toISOString() })
        .eq("id", p.session_id)
        .eq("patient_id", uid);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // terminate_if_stale
    const { data, error } = await supabase.rpc("terminate_if_stale", { _session_id: p.session_id });
    if (error) return json({ error: error.message }, 500);
    const row = Array.isArray(data) ? data[0] : data;
    return json(row ?? null);
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
