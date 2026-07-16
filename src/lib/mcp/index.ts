import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAnalysesTool from "./tools/list-analyses";
import getAnalysisTool from "./tools/get-analysis";
import getSubscriptionTool from "./tools/get-subscription";

// Direct Supabase issuer (never the .lovable.cloud proxy). Project ref is
// inlined at build time and stays import-safe (no runtime env read).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pitchgauge-mcp",
  title: "PitchGauge",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in PitchGauge user's startup analyses and subscription. Use list_analyses to browse saved analyses, get_analysis for full detail (memo, scorecard, red flags, benchmarking), and get_subscription for the current plan.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAnalysesTool, getAnalysisTool, getSubscriptionTool],
});
