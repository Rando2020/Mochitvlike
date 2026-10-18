import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import SystemPage from "@/app/system/page";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { connectionChecks } from "../status";
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("../status", () => ({ connectionChecks: vi.fn(async () => []) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("OPERATIONS_OWNER_IDS", "owner"); });
afterEach(() => vi.unstubAllEnvs());
describe("Owner diagnostics boundary", () => {
  it("does not run probes before sign-in", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as any);
    await expect(SystemPage()).rejects.toThrow("REDIRECT:/login");
    expect(connectionChecks).not.toHaveBeenCalled();
  });
  it("does not run probes for another signed-in creator", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "other" } }, error: null }) } } as any);
    await expect(SystemPage()).rejects.toThrow("NOT_FOUND");
    expect(connectionChecks).not.toHaveBeenCalled();
  });
  it("requires successful remote auth even if a user object is present", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: new Error() }) } } as any);
    await expect(SystemPage()).rejects.toThrow("REDIRECT:/login");
    expect(connectionChecks).not.toHaveBeenCalled();
  });
  it("runs safe probes after owner verification", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) } } as any);
    await SystemPage();
    expect(connectionChecks).toHaveBeenCalledOnce();
  });
});
