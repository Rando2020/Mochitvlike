import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { admitGeneration } from "../generationAdmission";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));
const rpc = vi.fn();
const eq = vi.fn().mockResolvedValue({ error: null });
beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv("TEXT_GENERATION_ENABLED", "true");
  vi.mocked(createAdminSupabaseClient).mockReturnValue({ rpc, from: () => ({ update: () => ({ eq }) }) } as never);
});
it("defaults off and never contacts the DB", async () => {
  vi.stubEnv("TEXT_GENERATION_ENABLED", "");
  await expect(admitGeneration("owner")).rejects.toMatchObject({ status: 503, code: "GENERATION_DISABLED" });
  expect(rpc).not.toHaveBeenCalled();
});
it.each(["CONCURRENT", "USER_LIMIT", "GLOBAL_LIMIT"])("rejects %s before any provider call", async data => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(admitGeneration("owner")).rejects.toMatchObject({ status: 429 });
});
it.each([{ data: null, error: new Error("missing schema") }, { data: "unexpected", error: null }])("fails closed on unavailable admission", async result => {
  rpc.mockResolvedValue(result);
  await expect(admitGeneration("owner")).rejects.toMatchObject({ status: 503, code: "GENERATION_LIMIT_UNAVAILABLE" });
});
it("releases only the reserved ID and never refunds its attempt", async () => {
  rpc.mockResolvedValue({ data: "ACCEPTED", error: null });
  const release = await admitGeneration("owner"); await release();
  const id = rpc.mock.calls[0][1].p_id;
  expect(eq).toHaveBeenCalledWith("id", id);
});

afterEach(() => vi.unstubAllEnvs());
