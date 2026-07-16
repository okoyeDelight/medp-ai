import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "log_vital",
  title: "Log a vitals reading",
  description:
    "Record a new vitals reading (pulse, blood pressure, glucose) for the signed-in user. All fields are optional but at least one measurement must be provided.",
  inputSchema: {
    pulse_bpm: z.number().int().min(20).max(250).optional().describe("Heart rate in beats per minute."),
    systolic: z.number().int().min(50).max(260).optional().describe("Systolic blood pressure (mmHg)."),
    diastolic: z.number().int().min(30).max(180).optional().describe("Diastolic blood pressure (mmHg)."),
    glucose_mgdl: z.number().int().min(20).max(800).optional().describe("Blood glucose (mg/dL)."),
    source: z.string().max(60).optional().describe("Where the reading came from (e.g. 'manual', 'wearable')."),
    notes: z.string().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const hasAny =
      input.pulse_bpm != null ||
      input.systolic != null ||
      input.diastolic != null ||
      input.glucose_mgdl != null;
    if (!hasAny)
      return {
        content: [{ type: "text", text: "Provide at least one of pulse_bpm, systolic, diastolic, glucose_mgdl." }],
        isError: true,
      };
    const { data, error } = await sb(ctx)
      .from("vitals_logs")
      .insert({
        user_id: ctx.getUserId(),
        pulse_bpm: input.pulse_bpm ?? null,
        systolic: input.systolic ?? null,
        diastolic: input.diastolic ?? null,
        glucose_mgdl: input.glucose_mgdl ?? null,
        source: input.source ?? "mcp",
        notes: input.notes ?? null,
        measured_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged vitals reading ${data.id}` }],
      structuredContent: { vital: data },
    };
  },
});
