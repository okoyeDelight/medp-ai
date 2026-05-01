import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are a Nigerian pharmacist assistant. The user is asking about a herbal supplement.
Return STRICT JSON via the tool. If you don't know the NAFDAC number, return null.
Be conservative on safety: include real interactions and contraindications you are confident about. Include a clear "ai_assisted" flag (always true).
Cite real Nigerian/African herbal pharmacology where possible.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Look up this herbal product / supplement: "${query}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "supplement_info",
              description: "Return supplement registration + safety profile.",
              parameters: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  botanical: { type: "string" },
                  nafdacNumber: { type: ["string", "null"] },
                  status: {
                    type: "string",
                    enum: ["registered", "unregistered", "expired", "unknown"],
                  },
                  manufacturer: { type: "string" },
                  indications: { type: "array", items: { type: "string" } },
                  dose: { type: "string" },
                  administration: { type: "string" },
                  properties: { type: "array", items: { type: "string" } },
                  contraindications: { type: "array", items: { type: "string" } },
                  drugInteractions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        drug: { type: "string" },
                        severity: { type: "string", enum: ["danger", "caution"] },
                        why: { type: "string" },
                      },
                      required: ["drug", "severity", "why"],
                      additionalProperties: false,
                    },
                  },
                  sideEffects: { type: "array", items: { type: "string" } },
                  ai_assisted: { type: "boolean" },
                },
                required: [
                  "productName",
                  "botanical",
                  "status",
                  "manufacturer",
                  "indications",
                  "dose",
                  "administration",
                  "properties",
                  "contraindications",
                  "drugInteractions",
                  "sideEffects",
                  "ai_assisted",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "supplement_info" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI lookup failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const argsStr =
      json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      parsed = {};
    }
    parsed.ai_assisted = true;

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nafdac-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
