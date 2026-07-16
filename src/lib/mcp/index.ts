import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listRecentVitals from "./tools/list-recent-vitals";
import logVital from "./tools/log-vital";
import listRecentDoses from "./tools/list-recent-doses";
import getSafetyScore from "./tools/get-safety-score";

// Direct Supabase issuer host — required by mcp-js token verification.
// Falls back to a sentinel string during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medp-ai-mcp",
  title: "MedP-AI",
  version: "0.1.0",
  instructions:
    "Personal MedP-AI tools for the signed-in user: read your profile, list and log vitals, list your recent herbal doses, and check your Health Safety Score.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listRecentVitals, logVital, listRecentDoses, getSafetyScore],
});
