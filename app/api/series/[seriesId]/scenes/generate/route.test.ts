import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { getSceneByBeat } from "@/lib/scenes/persistence/getScene";
import { saveScene } from "@/lib/scenes/persistence/saveScene";
import { generateSceneBlueprint, SceneGenerationError } from "@/lib/scenes/generateSceneBlueprint";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: vi.fn() }));
vi.mock("@/lib/scenes/persistence/getScene", () => ({ getSceneByBeat: vi.fn() }));
vi.mock("@/lib/scenes/persistence/saveScene", () => ({ saveScene: vi.fn() }));
vi.mock("@/lib/scenes/generateSceneBlueprint", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/scenes/generateSceneBlueprint")>()),
  generateSceneBlueprint: vi.fn()
}));

const seriesId = "22222222-2222-4222-8222-222222222222";
const creatorId = "11111111-1111-4111-8111-111111111111";

function request() {
  return new NextRequest(`http://localhost/api/series/${seriesId}/scenes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episodeKey: "episodeOne", beatId: "beat_1" })
  });
}

async function generate() {
  return POST(request(), { params: Promise.resolve({ seriesId }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: creatorId } }, error: null }) }
  } as never);
  vi.mocked(getSeries).mockResolvedValue({ id: seriesId, blueprint: theWoundsWeKeep } as never);
  vi.mocked(getSceneByBeat).mockResolvedValue(null);
});

describe("POST scene generation error boundaries", () => {
  it.each([
    ["SCENE_PROVIDER_UNAVAILABLE", 503],
    ["SCENE_GENERATION_FAILED", 502],
    ["SCENE_REPAIR_FAILED", 422]
  ] as const)("maps %s to %i without leaking provider diagnostics or writing scenes", async (code, status) => {
    vi.mocked(generateSceneBlueprint).mockRejectedValue(new SceneGenerationError(code, "private provider details"));
    const response = await generate();
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body.error.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("private provider details");
    expect(saveScene).not.toHaveBeenCalled();
    expect(generateSceneBlueprint).toHaveBeenCalledOnce();
  });

  it("requires a verified session before invoking a generation provider", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) }
    } as never);
    const response = await generate();
    expect(response.status).toBe(401);
    expect(getSeries).not.toHaveBeenCalled();
    expect(generateSceneBlueprint).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown beat without charging a provider", async () => {
    const response = await POST(new NextRequest(`http://localhost/api/series/${seriesId}/scenes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeKey: "episodeOne", beatId: "not-a-beat" })
    }), { params: Promise.resolve({ seriesId }) });
    expect(response.status).toBe(404);
    expect(generateSceneBlueprint).not.toHaveBeenCalled();
  });
});
