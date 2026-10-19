import type { SupabaseClient } from "@supabase/supabase-js";
export type ConnectionCheck = { label: string; state: "verified" | "configured" | "needs_attention"; message: string };
export async function connectionChecks(supabase: SupabaseClient): Promise<ConnectionCheck[]> {
  const checks: ConnectionCheck[] = [{ label: "Sign-in", state: "verified", message: "Your identity was verified by the account service." }];
  for (const [table, label] of [["series", "Saved projects"], ["storyboard_panel_generations", "Storyboard queue"]]) {
    try {
      const { error } = await supabase.from(table).select("id", { head: true }).limit(1).abortSignal(AbortSignal.timeout(5000));
      checks.push({ label, state: error ? "needs_attention" : "verified", message: error ? "This connection needs attention. Check database migrations and permissions." : "The table can be reached with your account permissions. No records were changed." });
    } catch { checks.push({ label, state: "needs_attention", message: "The connection did not respond. Try again, then check database setup." }); }
  }
  for (const [label, present, message] of [
    ["Story AI", Boolean(process.env.OPENAI_API_KEY && (process.env.OPENAI_SERIES_MODEL || process.env.OPENAI_SCENE_MODEL)), "Key and show model are configured. Provider access and generation have not been tested."],
    ["Scene planning", Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_SCENE_MODEL), "Key and scene model are configured. Provider access and scene generation have not been tested."],
    ["Worker access", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CRON_SECRET), "Worker credentials are configured. Scheduling and execution have not been tested."],
    ["Visual inference", Boolean(process.env.VISUAL_INFERENCE_URL && process.env.VISUAL_INFERENCE_TOKEN), "Endpoint and token are configured. GPU readiness and generation have not been tested."],
    ["Motion", Boolean(process.env.RUNWAYML_API_SECRET), "Key is configured. Provider access has not been tested."],
    ["Sound", Boolean(process.env.ELEVENLABS_API_KEY), "Key is configured. Provider access has not been tested."]
  ] as const) checks.push({ label, state: present ? "configured" : "needs_attention", message: present ? message : "Optional service is not configured. Add credentials in hosting settings when needed." });
  try {
    // RLS-backed bucket visibility is a real read, not a credential-presence check.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      supabase.storage.getBucket("production-references"),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("TIMEOUT")), 5000); })
    ]).finally(() => { if (timeout) clearTimeout(timeout); });
    const { data, error } = result;
    checks.push({ label: "Reference storage", state: !error && data ? "verified" : "needs_attention", message: !error && data ? "The reference bucket is visible to this account. Upload and signed download have not been tested." : "The reference bucket could not be verified with this account. Check bucket setup and permissions." });
  } catch { checks.push({ label: "Reference storage", state: "needs_attention", message: "Storage could not be checked. Check bucket setup and permissions." }); }
  return checks;
}
