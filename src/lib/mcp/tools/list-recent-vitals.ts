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
  name: "list_recent_vitals",
  title: "List recent vitals",
  description:
    "List the signed-in user's most recent vitals (pulse, blood pressure, glucose) ordered by measurement time, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max rows to return (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("vitals_logs")
      .select(
        "id,pulse_bpm,systolic,diastolic,glucose_mgdl,signal_quality,source,notes,measured_at",
      )
      .eq("user_id", ctx.getUserId())
      .order("measured_at", { ascending: false })
      .limit(limit);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { vitals: data ?? [] },
    };
  },
});
