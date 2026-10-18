import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { StoryPlanError } from "@/lib/story-seeds/persistence";
import { GET, PUT } from "../route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: vi.fn() }));
vi.mock("@/lib/story-seeds/persistence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/story-seeds/persistence")>("@/lib/story-seeds/persistence");
  return { ...actual, readStoryPlan: vi.fn(), writeStoryPlan: vi.fn() };
});
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { readStoryPlan, writeStoryPlan } from "@/lib/story-seeds/persistence";

const seriesId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ seriesId }) };
function request(method: "GET" | "PUT", body?: unknown) {
  return new NextRequest("http://localhost/api/series/" + seriesId + "/story-seeds", {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
  });
}
function authenticated() {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) }
  } as never);
  vi.mocked(getSeries).mockResolvedValue({
    id: seriesId, creatorId: "owner", title: "Show", slug: null, status: "DRAFT",
    blueprint: theWoundsWeKeep, schemaVersion: "1.0", generationSource: "llm",
    createdAt: "", updatedAt: "", archivedAt: null
  });
}
const payload = {
  requestId: "11111111-1111-4111-8111-111111111111", expectedRevision: 0,
  acknowledgeLockedChanges: false, seeds: [{
    id: "33333333-3333-4333-8333-333333333333", title: "The revelation",
    type: "REVEAL", placement: "MIDPOINT", characterId: "char_orin",
    locked: true, setup: "", consequence: "", payoff: ""
  }]
};
beforeEach(() => vi.resetAllMocks());

describe("story seed API", () => {
  it("denies anonymous readers", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) }
    } as never);
    expect((await GET(request("GET"),context)).status).toBe(401);
  });
  it("denies cross-owner reads and writes without revealing existence", async () => {
    authenticated();
    vi.mocked(getSeries).mockRejectedValue(new SeriesPersistenceError("SERIES_NOT_FOUND", "Not found"));
    expect((await GET(request("GET"),context)).status).toBe(404);
    expect((await PUT(request("PUT",payload),context)).status).toBe(404);
    expect(writeStoryPlan).not.toHaveBeenCalled();
  });
  it("reads only owner-scoped saved plan", async () => {
    authenticated();
    vi.mocked(readStoryPlan).mockResolvedValue({revision:0,seeds:[],updatedAt:null});
    const response=await GET(request("GET"),context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toMatch(/no-store/);
    expect(await response.json()).toMatchObject({plan:{revision:0,seeds:[]}});
  });
  it("rejects client-supplied ownership and malformed saves", async () => {
    authenticated();
    expect((await PUT(request("PUT", {...payload, creatorId: "attacker" }),context)).status).toBe(400);
    expect((await PUT(request("PUT", {...payload, seeds: [{...payload.seeds[0], characterId: "unknown"}]}),context)).status).toBe(400);
    expect(writeStoryPlan).not.toHaveBeenCalled();
  });
  it("saves validated seeds and preserves request receipt", async () => {
    authenticated();
    vi.mocked(writeStoryPlan).mockResolvedValue({revision:1,seeds:payload.seeds as never,updatedAt:"2026-10-18"});
    const response = await PUT(request("PUT",payload),context);
    expect(response.status).toBe(200);
    expect(writeStoryPlan).toHaveBeenCalledWith(expect.anything(), seriesId, theWoundsWeKeep, expect.objectContaining({ requestId: payload.requestId }));
  });
  it("maps stale save and locked-change gate to conflict", async () => {
    authenticated();
    vi.mocked(writeStoryPlan).mockRejectedValueOnce(new StoryPlanError("STORY_REVISION_CONFLICT"))
      .mockRejectedValueOnce(new StoryPlanError("STORY_LOCKED_CHANGE_REQUIRES_REVIEW"));
    expect((await PUT(request("PUT",payload),context)).status).toBe(409);
    expect((await PUT(request("PUT",payload),context)).status).toBe(409);
  });
  it("returns service unavailable until isolated migration is applied", async () => {
    authenticated();
    vi.mocked(readStoryPlan).mockRejectedValue(new StoryPlanError("STORY_STORAGE_UNAVAILABLE"));
    expect((await GET(request("GET"),context)).status).toBe(503);
  });
});
