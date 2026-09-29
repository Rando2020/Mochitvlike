import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: vi.fn() }));
vi.mock("@/lib/scenes/persistence/getScene", () => ({ getScene: vi.fn() }));
vi.mock("@/lib/scripts/persistence/getScript", () => ({ getLatestScript: vi.fn() }));
vi.mock("@/lib/scripts/context/buildScriptContext", () => ({ buildScriptContext: vi.fn(() => ({})) }));
vi.mock("@/lib/scripts/generateSceneScript", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scripts/generateSceneScript")>("@/lib/scripts/generateSceneScript");
  return { ...actual, generateSceneScript: vi.fn() };
});
vi.mock("@/lib/scripts/persistence/saveScript", () => ({ saveScript: vi.fn() }));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { getLatestScript } from "@/lib/scripts/persistence/getScript";
import { generateSceneScript } from "@/lib/scripts/generateSceneScript";
import { saveScript } from "@/lib/scripts/persistence/saveScript";
import { POST } from "../generate/route";

const seriesId = "22222222-2222-4222-8222-222222222222";
const sceneId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown = { mode: "INITIAL" }) {
  return new NextRequest("http://localhost/api/series/" + seriesId + "/scenes/" + sceneId + "/scripts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function authClient(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null
      })
    }
  };
}

function ownedSeries() {
  return {
    id: seriesId,
    creatorId: "user-1",
    title: "The Wounds We Keep",
    slug: null,
    status: "DRAFT" as const,
    blueprint: theWoundsWeKeep,
    schemaVersion: "1.0",
    generationSource: "llm" as const,
    createdAt: "",
    updatedAt: "",
    archivedAt: null
  };
}

function ownedScene() {
  return {
    id: sceneId,
    seriesId,
    creatorId: "user-1",
    episodeKey: "episodeOne" as const,
    sourceBeatId: "beat_1",
    status: "DRAFT" as const,
    blueprint: buildValidScene(),
    schemaVersion: "1.0",
    generationSource: "llm" as const,
    createdAt: "",
    updatedAt: "",
    archivedAt: null
  };
}

beforeEach(() => vi.resetAllMocks());

describe("POST script generation", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient(null) as never);
    const response = await POST(request(), { params: Promise.resolve({ seriesId, sceneId }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 for a foreign series", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient("user-1") as never);
    vi.mocked(getSeries).mockRejectedValue(new SeriesPersistenceError("SERIES_NOT_FOUND", "missing"));
    const response = await POST(request(), { params: Promise.resolve({ seriesId, sceneId }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a foreign scene", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient("user-1") as never);
    vi.mocked(getSeries).mockResolvedValue(ownedSeries());
    vi.mocked(getScene).mockRejectedValue(new ScenePersistenceError("SCENE_NOT_FOUND", "missing"));
    const response = await POST(request(), { params: Promise.resolve({ seriesId, sceneId }) });
    expect(response.status).toBe(404);
  });

  it("returns existing INITIAL script without provider generation", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient("user-1") as never);
    vi.mocked(getSeries).mockResolvedValue(ownedSeries());
    vi.mocked(getScene).mockResolvedValue(ownedScene());
    vi.mocked(getLatestScript).mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      sceneId,
      seriesId,
      creatorId: "user-1",
      version: 1,
      status: "DRAFT",
      script: buildValidScript(),
      schemaVersion: "1.0",
      generationSource: "llm",
      createdAt: "",
      updatedAt: "",
      archivedAt: null
    });

    const response = await POST(request(), { params: Promise.resolve({ seriesId, sceneId }) });
    expect(response.status).toBe(200);
    expect(generateSceneScript).not.toHaveBeenCalled();
  });

  it("persists a new initial script as version one", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient("user-1") as never);
    vi.mocked(getSeries).mockResolvedValue(ownedSeries());
    vi.mocked(getScene).mockResolvedValue(ownedScene());
    vi.mocked(getLatestScript).mockResolvedValue(null);
    vi.mocked(generateSceneScript).mockResolvedValue({ script: buildValidScript(), source: "llm" });
    vi.mocked(saveScript).mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      version: 1,
      status: "DRAFT",
      updatedAt: "",
      reused: false
    });

    const response = await POST(request(), { params: Promise.resolve({ seriesId, sceneId }) });
    expect(response.status).toBe(201);
    expect(saveScript).toHaveBeenCalledTimes(1);
  });

  it("rejects arbitrary generation payload fields", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(authClient("user-1") as never);
    const response = await POST(request({ mode: "INITIAL", creatorId: "attacker" }), {
      params: Promise.resolve({ seriesId, sceneId })
    });
    expect(response.status).toBe(400);
  });
});
