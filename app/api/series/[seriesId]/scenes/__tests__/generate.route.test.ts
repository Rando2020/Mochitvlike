import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { SceneContextError } from "@/lib/scenes/context/buildSceneContext";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/series/persistence/getSeries", () => ({
  getSeries: vi.fn()
}));

vi.mock("@/lib/scenes/persistence/getScene", () => ({
  getSceneByBeat: vi.fn()
}));

vi.mock("@/lib/scenes/context/buildSceneContext", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scenes/context/buildSceneContext")>(
    "@/lib/scenes/context/buildSceneContext"
  );
  return {
    ...actual,
    buildSceneContext: vi.fn()
  };
});

vi.mock("@/lib/scenes/generateSceneBlueprint", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scenes/generateSceneBlueprint")>(
    "@/lib/scenes/generateSceneBlueprint"
  );
  return {
    ...actual,
    generateSceneBlueprint: vi.fn()
  };
});

vi.mock("@/lib/scenes/persistence/saveScene", () => ({
  saveScene: vi.fn()
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { getSceneByBeat } from "@/lib/scenes/persistence/getScene";
import { buildSceneContext } from "@/lib/scenes/context/buildSceneContext";
import { generateSceneBlueprint } from "@/lib/scenes/generateSceneBlueprint";
import { saveScene } from "@/lib/scenes/persistence/saveScene";
import { POST } from "../generate/route";

const seriesId = "22222222-2222-4222-8222-222222222222";
const sceneId = "11111111-1111-4111-8111-111111111111";

function request() {
  return new NextRequest("http://localhost/api/series/" + seriesId + "/scenes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episodeKey: "episodeOne", beatId: "beat_1" })
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST scene generation route", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null })
      }
    } as never);

    const response = await POST(request(), { params: Promise.resolve({ seriesId }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 for a foreign or unknown series", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
      }
    } as never);

    vi.mocked(getSeries).mockRejectedValue(
      new SeriesPersistenceError("SERIES_NOT_FOUND", "Series was not found.")
    );

    const response = await POST(request(), { params: Promise.resolve({ seriesId }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown beat", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
      }
    } as never);

    vi.mocked(getSeries).mockResolvedValue({
      id: seriesId,
      creatorId: "user-1",
      title: "The Wounds We Keep",
      slug: null,
      status: "DRAFT",
      blueprint: theWoundsWeKeep,
      schemaVersion: "1.0",
      generationSource: "llm",
      createdAt: "",
      updatedAt: "",
      archivedAt: null
    });

    vi.mocked(getSceneByBeat).mockResolvedValue(null);
    vi.mocked(buildSceneContext).mockImplementation(() => {
      throw new SceneContextError("UNKNOWN_BEAT");
    });

    const response = await POST(request(), { params: Promise.resolve({ seriesId }) });
    expect(response.status).toBe(404);
  });

  it("persists a valid generated scene for an owned series", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
      }
    } as never);

    vi.mocked(getSeries).mockResolvedValue({
      id: seriesId,
      creatorId: "user-1",
      title: "The Wounds We Keep",
      slug: null,
      status: "DRAFT",
      blueprint: theWoundsWeKeep,
      schemaVersion: "1.0",
      generationSource: "llm",
      createdAt: "",
      updatedAt: "",
      archivedAt: null
    });

    vi.mocked(getSceneByBeat).mockResolvedValue(null);
    vi.mocked(buildSceneContext).mockReturnValue({} as never);
    vi.mocked(generateSceneBlueprint).mockResolvedValue({
      scene: buildValidScene(),
      source: "llm"
    });
    vi.mocked(saveScene).mockResolvedValue({
      id: sceneId,
      sourceBeatId: "beat_1",
      status: "DRAFT",
      updatedAt: "",
      reused: false
    });

    const response = await POST(request(), { params: Promise.resolve({ seriesId }) });

    expect(response.status).toBe(201);
    expect(saveScene).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing beat scene without calling the provider", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } }, error: null })
      }
    } as never);

    vi.mocked(getSeries).mockResolvedValue({
      id: seriesId,
      creatorId: "user-1",
      title: "The Wounds We Keep",
      slug: null,
      status: "DRAFT",
      blueprint: theWoundsWeKeep,
      schemaVersion: "1.0",
      generationSource: "llm",
      createdAt: "",
      updatedAt: "",
      archivedAt: null
    });

    vi.mocked(getSceneByBeat).mockResolvedValue({
      id: sceneId,
      seriesId,
      creatorId: "user-1",
      episodeKey: "episodeOne",
      sourceBeatId: "beat_1",
      status: "DRAFT",
      blueprint: buildValidScene(),
      schemaVersion: "1.0",
      generationSource: "llm",
      createdAt: "",
      updatedAt: "",
      archivedAt: null
    });

    const response = await POST(request(), { params: Promise.resolve({ seriesId }) });

    expect(response.status).toBe(200);
    expect(generateSceneBlueprint).not.toHaveBeenCalled();
  });
});
