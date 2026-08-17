// Batch UI translation for the global language toggle.
// Public (no JWT) — translates only UI strings, never patient data.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const texts: unknown = body?.texts;
    const language = String(body?.language ?? "").slice(0, 60);
    if (!Array.isArray(texts) || texts.length === 0 || !language) {
      return new Response(JSON.stringify({ error: "texts[] and language required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const items = texts.slice(0, 300).map((t) => String(t).slice(0, 400));

    const sys = `You are a professional medical-app localiser. Translate each UI string into ${language}.
Rules:
- Return ONLY a JSON array of strings, same length and same order as the input array.
- Keep placeholders like {name}, {km}, {license}, emojis, numbers, units (mg, ml, BPM) and brand names ("MedP-AI", "MDCN", "NAFDAC") unchanged.
- Keep it short — these are buttons, labels and headings on a mobile screen.
- If a string is a number, symbol or has no meaningful translation, return it unchanged.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(items) },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt.slice(0, 400) }), {
        status: aiResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    let out: string[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) out = parsed.map((v) => String(v));
    } catch {
      out = [];
    }
    if (out.length !== items.length) out = items;

    return new Response(JSON.stringify({ translations: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
