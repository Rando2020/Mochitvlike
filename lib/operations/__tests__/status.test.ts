import { it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connectionChecks } from "../status";
afterEach(() => vi.unstubAllEnvs());
it("does not expose provider secrets or database errors and never invokes a job", async () => {
  vi.stubEnv("OPENAI_API_KEY", "secret-provider-token");
  vi.stubEnv("OPENAI_SERIES_MODEL", "configured-model");
  const rpc = vi.fn();
  const from = vi.fn(() => ({ select: () => ({ limit: () => ({ abortSignal: async () => ({ error: { message: "private database details" } }) }) }) }));
  const client = { from, rpc, storage: { getBucket: async () => ({ data: null, error: { message: "private storage details" } }) } } as unknown as SupabaseClient;
  const checks = await connectionChecks(client);
  expect(JSON.stringify(checks)).not.toContain("secret-provider-token");
  expect(JSON.stringify(checks)).not.toContain("private");
  expect(checks.find(c => c.label === "Story AI")?.state).toBe("configured");
  expect(checks.find(c => c.label === "Saved projects")?.state).toBe("needs_attention");
  expect(rpc).not.toHaveBeenCalled();
});
