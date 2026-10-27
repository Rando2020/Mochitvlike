import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GET, POST } from "../route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
const seriesId = "22222222-2222-4222-8222-222222222222";
const params = { params: Promise.resolve({ seriesId }) };
const url = `http://localhost/api/series/${seriesId}/story-assistant`;
let userId: string | null;
let archived: boolean;
let archivedAt: string | null;
let seedFailure: boolean;
let reads: Array<{ table: string; filters: Record<string, string> }>;
let writes: ReturnType<typeof vi.fn>;
let fixtureMode = false;
let fixtureAction: (() => void) | undefined;
let blueprintVersion = "2026-10-25T08:00:00Z";
let providerCalls = 0;
vi.mock("@/lib/story-assistant/provider", async () => {
  const actual = await vi.importActual<typeof import("@/lib/story-assistant/provider")>("@/lib/story-assistant/provider");
  return { ...actual, disabledStoryAssistantProvider: {
    get capability() { return { enabled: fixtureMode, reason: "Fixture transport only" }; },
    async generate() {
      providerCalls++; fixtureAction?.();
      return [{ title: "Fixture only", beat: "Choose a costly healing.", whyItFits: "The cost tests the saved premise.",
        setup: "Establish a visible cost.", consequences: "The choice changes trust.", sourceIds: ["blueprint:identity"],
        alternative: { beat: "Refuse to heal.", tradeoff: "More hesitation, less momentum.", sourceIds: ["blueprint:identity"] } }];
    }
  } };
});
function request(method: "GET" | "POST", body?: unknown, path = url, headers: Record<string,string> = {}) {
  return new NextRequest(path, { method, headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const payload = { prompt: "Suggest an earned choice, not a formula.", selectedBeatIds: [], expectedSnapshot: "a".repeat(64) };
beforeEach(() => {
  fixtureMode = false; fixtureAction = undefined; providerCalls = 0; blueprintVersion = "2026-10-25T08:00:00Z";
  userId = "owner"; archived = false; archivedAt = null; seedFailure = false; reads = []; writes = vi.fn(() => { throw new Error("WRITES_FORBIDDEN"); });
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    from(table: string) {
      const filters: Record<string,string> = {};
      const query = {
        select() { return query; }, eq(key: string, value: string) { filters[key] = value; return query; },
        async maybeSingle() {
          reads.push({ table, filters: { ...filters } });
          if (table === "series") return { error: null, data: filters.id === seriesId && filters.creator_id === "owner" ? {
            id: seriesId, creator_id: "owner", title: "Saved owned show", slug: null,
            status: archived ? "ARCHIVED" : "DRAFT", blueprint: theWoundsWeKeep,
            blueprint_schema_version: "1.0", generation_source: "llm",
            created_at: "2026-10-01T00:00:00Z", updated_at: blueprintVersion, archived_at: archivedAt
          } : null };
          if (table === "story_seed_plans") return { error: seedFailure ? { message: "PRIVATE STORAGE DETAIL" } : null, data: null };
          throw new Error("Unexpected table");
        }, insert: writes, update: writes, upsert: writes, delete: writes
      };
      return query;
    }, rpc: writes
  } as never);
});

describe("creator-only storytelling assistant API", () => {
  it("denies anonymous GET and POST without loading story data", async () => {
    userId = null;
    expect((await GET(request("GET"), params)).status).toBe(401);
    expect((await POST(request("POST", payload), params)).status).toBe(401);
    expect(reads).toEqual([]);
  });
  it("uses owner-scoped reads and does not reveal another creator's series", async () => {
    userId = "different-owner";
    const response = await GET(request("GET"), params);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(theWoundsWeKeep.identity.title);
    expect((await POST(request("POST", payload), params)).status).toBe(404);
    expect(reads.every(read => read.table === "series" && read.filters.creator_id === "different-owner")).toBe(true);
  });
  it.each(["status", "timestamp"])("denies archived series by %s", async (field) => {
    if (field === "status") archived = true; else archivedAt = "2026-10-25T08:00:00Z";
    expect((await GET(request("GET"), params)).status).toBe(404);
    expect((await POST(request("POST", payload), params)).status).toBe(404);
    expect(reads.some(read => read.table === "story_seed_plans")).toBe(false);
  });
  it("returns saved grounding with empty seeds, private no-store and disabled capability", async () => {
    const response = await GET(request("GET"), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body).toMatchObject({ capability: { enabled: false }, context: { snapshot: { seriesId, seedRevision: 0 }, selectedBeatIds: [] } });
    expect(body.context.sources.some((source: { content: string }) => source.content.includes(theWoundsWeKeep.identity.title))).toBe(true);
    expect(reads).toEqual([{ table: "series", filters: { id: seriesId, creator_id: "owner" } }, { table: "story_seed_plans", filters: { series_id: seriesId, creator_id: "owner" } }]);
    expect(writes).not.toHaveBeenCalled();
  });
  it("does not present unavailable seed storage as known empty or leak storage errors", async () => {
    seedFailure = true;
    const response = await GET(request("GET"), params);
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("ASSISTANT_CONTEXT_UNAVAILABLE");
    expect(body).not.toContain("PRIVATE STORAGE DETAIL");
    expect(body).not.toContain('"context"');
  });
  it("binds valid selected beats and rejects unknown selections", async () => {
    const beatId = theWoundsWeKeep.episodeOne.beats[0].id;
    const response = await GET(request("GET", undefined, `${url}?beatId=${encodeURIComponent(beatId)}`), params);
    expect(response.status).toBe(200);
    expect((await response.json()).context.selectedBeatIds).toEqual([beatId]);
    expect((await GET(request("GET", undefined, `${url}?beatId=not-a-beat`), params)).status).toBe(400);
  });
  it("rejects public/rehearsal modes and client-authored sources", async () => {
    expect((await GET(request("GET", undefined, `${url}?mode=fan`), params)).status).toBe(400);
    expect((await POST(request("POST", { ...payload, mode: "rehearsal" }), params)).status).toBe(400);
    expect((await POST(request("POST", { ...payload, blueprint: theWoundsWeKeep }), params)).status).toBe(400);
  });
  it("fails closed when generation is disabled and performs no writes", async () => {
    const context = await (await GET(request("GET"), params)).json();
    const response = await POST(request("POST", { ...payload, expectedSnapshot: context.context.snapshot.digest }), params);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "ASSISTANT_DISABLED" } });
    expect(writes).not.toHaveBeenCalled();
  });
  it("rejects malformed input and bounds bytes even without content-length", async () => {
    expect((await POST(request("POST", { ...payload, prompt: " " }), params)).status).toBe(400);
    expect((await POST(request("POST", { ...payload, prompt: "🔥".repeat(5000) }), params)).status).toBe(413);
    expect(writes).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and invalid content types", async () => {
    const malformed = new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect((await POST(malformed, params)).status).toBe(400);
    expect((await POST(request("POST", payload, url, { "Content-Type": "text/plain" }), params)).status).toBe(415);
  });
  it("blocks cross-origin requests before future provider admission", async () => {
    expect((await POST(request("POST", payload, url, { Origin: "https://evil.example" }), params)).status).toBe(403);
    expect((await POST(request("POST", payload, url, { "Sec-Fetch-Site": "cross-site" }), params)).status).toBe(403);
  });
  it("returns fixture-validated suggestions only after a fresh owner/seed re-read and never writes", async () => {
    fixtureMode = true;
    const before = await (await GET(request("GET"), params)).json();
    const response = await POST(request("POST", { ...payload, expectedSnapshot: before.context.snapshot.digest }), params);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.suggestions[0].title).toBe("Fixture only");
    expect(result.snapshot).toEqual(before.context.snapshot);
    expect(providerCalls).toBe(1);
    expect(reads.filter(read => read.table === "series")).toHaveLength(4);
    expect(writes).not.toHaveBeenCalled();
  });
  it("withholds an in-flight result when the saved bible changed", async () => {
    fixtureMode = true;
    const before = await (await GET(request("GET"), params)).json();
    fixtureAction = () => { blueprintVersion = "2026-10-25T08:01:00Z"; };
    const response = await POST(request("POST", { ...payload, expectedSnapshot: before.context.snapshot.digest }), params);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "ASSISTANT_STALE_CONTEXT" } });
    expect(writes).not.toHaveBeenCalled();
  });
  it("withholds an in-flight result when the series is archived", async () => {
    fixtureMode = true;
    const before = await (await GET(request("GET"), params)).json();
    fixtureAction = () => { archived = true; };
    const response = await POST(request("POST", { ...payload, expectedSnapshot: before.context.snapshot.digest }), params);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("Fixture only");
    expect(writes).not.toHaveBeenCalled();
  });
  it("revalidates ownership after reading the body, before future provider admission", async () => {
    fixtureMode = true;
    const before = await (await GET(request("GET"), params)).json();
    const post = request("POST", { ...payload, expectedSnapshot: before.context.snapshot.digest });
    const reader = post.body!.getReader.bind(post.body);
    vi.spyOn(post.body!, "getReader").mockImplementation((options?: ReadableStreamGetReaderOptions) => {
      archived = true;
      return reader(options);
    });
    const response = await POST(post, params);
    expect(response.status).toBe(404);
    expect(providerCalls).toBe(0);
  });
  it("does not support demo or malformed series identifiers", async () => {
    expect((await GET(request("GET"), { params: Promise.resolve({ seriesId: "demo" }) })).status).toBe(404);
    expect(reads).toEqual([]);
  });
});
