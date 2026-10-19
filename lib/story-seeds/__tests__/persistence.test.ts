import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { readStoryPlan, writeStoryPlan } from "../persistence";
import type { StorySeed } from "../schema";
const story: StorySeed = {
  id: "11111111-1111-4111-8111-111111111111", title: "Orin makes his choice",
  type: "EVENT", placement: "FINALE", characterId: "char_orin", locked: false,
  setup: "", consequence: "", payoff: ""
};
describe("Story Seed persistence boundary", () => {
  it("represents a missing row as revision zero, not fabricated approved content", async () => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null, error: null }) };
    const client = { from: () => chain } as unknown as SupabaseClient;
    expect(await readStoryPlan(client, "show", "owner", theWoundsWeKeep)).toEqual({
      revision: 0, seeds: [], updatedAt: null
    });
  });
  it("transmits only exact RPC parameters and recognizes atomic conflict", async () => {
    let args: Record<string, unknown> = {};
    const client = {
      rpc: async (name: string, input: Record<string, unknown>) => {
        expect(name).toBe("save_story_seed_plan_v1");
        args = input;
        return { data: null, error: { message: "STORY_REVISION_CONFLICT" } };
      }
    } as unknown as SupabaseClient;
    await expect(writeStoryPlan(client, "show", theWoundsWeKeep, {
      requestId: "22222222-2222-4222-8222-222222222222",
      expectedRevision: 1, acknowledgeLockedChanges: false, seeds: [story]
    })).rejects.toMatchObject({ code: "STORY_REVISION_CONFLICT" });
    expect(args).toMatchObject({ p_series_id: "show", p_expected_revision: 1 });
    expect(args).not.toHaveProperty("creator_id");
  });
  it("keeps malformed stored data from being rendered as editable plan", async () => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({
      data: { revision: 3, seeds: [{ ...story, characterId: "unknown" }], updated_at: "" }, error: null
    }) };
    await expect(readStoryPlan({ from: () => chain } as unknown as SupabaseClient,
      "show", "owner", theWoundsWeKeep)).rejects.toMatchObject({code:"STORY_STORAGE_UNAVAILABLE"});
  });
});
