// Plant identification via Lovable AI Gemini vision.
// Input: { imageBase64: string (data URL or raw base64), candidates: {id,name,localName}[] }
// Output: { id: string|null, confidence: "high"|"medium"|"low", reason: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => null);
    if (!body || typeof body.imageBase64 !== "string" || !Array.isArray(body.candidates)) {
      return new Response(JSON.stringify({ error: "imageBase64 and candidates are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = body.imageBase64.startsWith("data:")
      ? body.imageBase64
      : `data:image/jpeg;base64,${body.imageBase64}`;

    const candidateList = (body.candidates as Array<{ id: string; name: string; localName: string }>)
      .map((c) => `- id="${c.id}" — ${c.name} (${c.localName})`)
      .join("\n");

    const systemPrompt = `You are a Nigerian clinical pharmacognosist. Identify the plant in the photo.
You MUST pick the single best match from the candidate list, OR return id=null if the photo clearly is not any of them, is unclear, or is not a plant.
Be strict — wrong identification can harm someone. Prefer null over guessing.`;

    const userPrompt = `Candidates (only these IDs are allowed):\n${candidateList}\n\nReturn the matching id, a confidence rating, and a one-sentence reason in plain English.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_identification",
              description: "Report the plant identification result.",
              parameters: {
                type: "object",
                properties: {
                  id: {
                    type: ["string", "null"],
                    description: "The matching candidate id, or null if no confident match.",
                  },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string", description: "One short sentence explaining the choice." },
                },
                required: ["id", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_identification" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ id: null, confidence: "low", reason: "No identification produced." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);

    // Validate id is in candidate list
    const allowedIds = new Set((body.candidates as Array<{ id: string }>).map((c) => c.id));
    const validId = args.id && allowedIds.has(args.id) ? args.id : null;

    return new Response(
      JSON.stringify({
        id: validId,
        confidence: args.confidence ?? "low",
        reason: args.reason ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("identify-plant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
