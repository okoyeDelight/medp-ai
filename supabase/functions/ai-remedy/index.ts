// AI search for ANY plant remedy — Stream A (Pidgin prep) + Stream B (Lab science).
// Returns the same shape as our local Remedy type so the existing UI works as-is.

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

    const { query } = await req.json().catch(() => ({}));
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are a Nigerian clinical pharmacognosist creating an UNVERIFIED entry for a herbal-remedy app.
The user types a symptom (e.g. "ulcer", "boils", "ringworm") OR a plant name (e.g. "bitter kola", "scent leaf").
You must return a single best-fit remedy that is commonly used in Nigerian / West African traditional medicine for that symptom or matches that plant.

Voice: Nigerian Pidgin for prep & dose. English for the science block.
Quantities: use sachet water (50 cl), Eva bottle (75 cl), small spoon (5 ml), big spoon (15 ml), cup, leaf count.
Be HONEST — if you don't know good evidence, say so in the science block. NEVER invent fake citations.
If the request is dangerous (e.g. abortion, suicide, recreational), set safe=false and leave the remedy fields empty.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `User typed: "${query}"\n\nReturn one remedy via the tool call.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_remedy",
              description: "Return one herbal remedy in the app's required structure.",
              parameters: {
                type: "object",
                properties: {
                  safe: { type: "boolean", description: "False only if request is dangerous." },
                  refusal_reason: { type: "string" },
                  name: { type: "string", description: "Common English name." },
                  localName: { type: "string", description: "Yoruba / Igbo / Hausa / pidgin name." },
                  emoji: { type: "string" },
                  blurb: { type: "string", description: "One-sentence Pidgin description." },
                  treats: {
                    type: "array",
                    items: { type: "string" },
                    description: "Symptom keywords (lowercase, English).",
                  },
                  imageHint: { type: "string", description: "Plain-English plant ID hint." },
                  prep: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        verb: {
                          type: "string",
                          enum: ["WASH", "PREP", "MEASURE", "BOIL", "SQUEEZE", "SIEVE", "MIX", "APPLY", "DRINK"],
                        },
                        text: { type: "string", description: "Pidgin instruction for this step." },
                        unit: {
                          type: "string",
                          enum: ["sachet", "eva", "spoon", "leaf", "fire", "cup"],
                        },
                        qty: { type: "number" },
                        timerMinutes: { type: "number", description: "Minutes if BOIL." },
                      },
                      required: ["verb", "text"],
                    },
                  },
                  dose: { type: "string", description: "Pidgin dose instruction." },
                  intervalHours: { type: "number" },
                  storage: { type: "string", description: "Pidgin storage advice." },
                  warning: { type: "string", description: "Plain-Pidgin caution; empty if none." },
                  interactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        drug: { type: "string" },
                        level: { type: "string", enum: ["red", "yellow", "green"] },
                        why: { type: "string" },
                      },
                      required: ["drug", "level", "why"],
                    },
                  },
                  science: {
                    type: "object",
                    properties: {
                      phytochemicals: { type: "array", items: { type: "string" } },
                      evidence: {
                        type: "object",
                        properties: {
                          citation: { type: "string" },
                          summary: { type: "string" },
                        },
                        required: ["citation", "summary"],
                      },
                      toxicity: {
                        type: "object",
                        properties: {
                          ld50: { type: "string" },
                          notes: { type: "string" },
                        },
                        required: ["notes"],
                      },
                      cypInteraction: { type: "string" },
                      source: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          url: { type: "string" },
                        },
                        required: ["label", "url"],
                      },
                    },
                    required: ["phytochemicals", "evidence", "toxicity", "source"],
                  },
                },
                required: ["safe"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_remedy" } },
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
      return new Response(JSON.stringify({ error: "no result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);

    if (args.safe === false) {
      return new Response(
        JSON.stringify({
          safe: false,
          refusal_reason: args.refusal_reason ?? "Request not supported.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark as AI-generated + slug an id
    const id = `ai-${(args.name ?? args.localName ?? "remedy")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

    const remedy = {
      id,
      name: args.name ?? "Unknown plant",
      localName: args.localName ?? args.name ?? "—",
      emoji: args.emoji ?? "🌿",
      blurb: args.blurb ?? "",
      treats: Array.isArray(args.treats) ? args.treats : [],
      imageHint: args.imageHint ?? "Confirm the plant with a herbalist before use.",
      prep: Array.isArray(args.prep) ? args.prep : [],
      dose: args.dose ?? "Drink small small. See pharmacist.",
      intervalHours: typeof args.intervalHours === "number" ? args.intervalHours : 8,
      storage: args.storage ?? "No keep this medicine pass 24 hours.",
      warning: args.warning || undefined,
      interactions: Array.isArray(args.interactions) ? args.interactions : [],
      science: args.science,
      __unverified: true,
    };

    return new Response(JSON.stringify({ safe: true, remedy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-remedy error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
