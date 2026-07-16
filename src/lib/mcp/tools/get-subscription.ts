import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

declare const process: { env: Record<string, string | undefined> };

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_subscription",
  title: "Get subscription",
  description:
    "Return the signed-in user's current PitchGauge subscription tier and status (free, pro, scale).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const { data, error } = await supabaseForUser(ctx)
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();

    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    const row = data ?? { tier: "free", status: "inactive", current_period_end: null };
    return {
      content: [{ type: "text", text: JSON.stringify(row) }],
      structuredContent: { subscription: row },
    };
  },
});
