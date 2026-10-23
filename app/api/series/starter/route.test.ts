import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSeriesRecord } from "@/lib/series/persistence/createSeries";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/series/persistence/createSeries", () => ({ createSeriesRecord: vi.fn() }));

const creationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const idea = "A detective investigates impossible echoes in an abandoned music hall.";
const call = (body: unknown) => POST(new NextRequest("http://localhost/api/series/starter", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) }
  } as never);
  vi.mocked(createSeriesRecord).mockResolvedValue({ id: creationId, title: "Saved draft", status: "DRAFT", createdAt: "today" });
});

describe("POST /api/series/starter", () => {
  it("saves an authenticated, creator-owned fallback without provider calls or claims", async () => {
    const response = await call({ creationId, idea, preferences: { episodeLengthSeconds: 60, targetEpisodeCount: 12 } });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).kind).toBe("STARTER_DRAFT");
    expect(createSeriesRecord).toHaveBeenCalledOnce();
    expect(vi.mocked(createSeriesRecord).mock.calls[0][1]).toMatchObject({
      creatorId: userId, creationId, metadata: { source: "fallback", schemaVersion: "1.0" },
      seriesBlueprint: { identity: { shortPremise: idea } }
    });
  });

  it("does not allow unauthenticated saves", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) }
    } as never);
    const response = await call({ creationId, idea });
    expect(response.status).toBe(401);
    expect(createSeriesRecord).not.toHaveBeenCalled();
  });

  it("rejects spoofed creator IDs and invalid ideas before any database request", async () => {
    for (const body of [
      { creationId, idea, creatorId: "attacker" },
      { creationId, idea: "a" },
      { idea },
      { creationId, idea, preferences: { targetEpisodeCount: 1000 } }
    ]) {
      const response = await call(body);
      expect(response.status).toBe(400);
    }
    expect(createSeriesRecord).not.toHaveBeenCalled();
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("does not assert success for an uncertain persistence response", async () => {
    vi.mocked(createSeriesRecord).mockRejectedValue(new Error("private DB failure"));
    const response = await call({ creationId, idea });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private DB failure");
  });
});
