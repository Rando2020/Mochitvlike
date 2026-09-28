import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { getScene } from "../persistence/getScene";
import { listScenes } from "../persistence/listScenes";
import { saveScene } from "../persistence/saveScene";
import { updateSceneStatus } from "../persistence/updateScene";
import { buildValidScene } from "./fixtures";

function readClient(data: unknown, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error })
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function insertClient(data: unknown, error: unknown = null) {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data, error })
        })
      })
    })
  } as unknown as SupabaseClient;
}

function listClient(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: rows, error: null })
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function updateClient(data: unknown, capture: Record<string, unknown>) {
  const chain = {
    eq: () => chain,
    select: () => chain,
    maybeSingle: async () => ({ data, error: null })
  };
  return {
    from: () => ({
      update: (value: Record<string, unknown>) => {
        Object.assign(capture, value);
        return chain;
      }
    })
  } as unknown as SupabaseClient;
}

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  series_id: "22222222-2222-4222-8222-222222222222",
  creator_id: "user-1",
  episode_key: "episodeOne",
  source_beat_id: "beat_1",
  status: "DRAFT",
  blueprint: buildValidScene(),
  blueprint_schema_version: "1.0",
  generation_source: "llm",
  created_at: "2026-09-28T00:00:00Z",
  updated_at: "2026-09-28T00:00:00Z",
  archived_at: null
};

describe("scene persistence", () => {
  it("reads and cross-validates a scene against its series", async () => {
    const scene = await getScene(
      readClient(row),
      "user-1",
      row.series_id,
      row.id,
      theWoundsWeKeep
    );
    expect(scene.blueprint.storyPurpose.requiredStoryChange).toBe(
      theWoundsWeKeep.episodeOne.beats[0].storyChange
    );
  });

  it("returns not found for ownership-scoped misses", async () => {
    await expect(
      getScene(readClient(null), "foreign", row.series_id, row.id, theWoundsWeKeep)
    ).rejects.toMatchObject({ code: "SCENE_NOT_FOUND" });
  });

  it("rejects a corrupted stored scene", async () => {
    await expect(
      getScene(
        readClient({ ...row, blueprint: {} }),
        "user-1",
        row.series_id,
        row.id,
        theWoundsWeKeep
      )
    ).rejects.toMatchObject({ code: "CORRUPT_STORED_SCENE" });
  });

  it("persists a new scene", async () => {
    const result = await saveScene(
      insertClient({
        id: row.id,
        source_beat_id: "beat_1",
        status: "DRAFT",
        updated_at: row.updated_at
      }),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        scene: buildValidScene(),
        generationSource: "llm"
      }
    );

    expect(result.reused).toBe(false);
    expect(result.id).toBe(row.id);
  });

  it("treats a unique beat collision as reuse rather than duplicate creation", async () => {
    const result = await saveScene(
      insertClient(null, { code: "23505" }),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        scene: buildValidScene(),
        generationSource: "llm"
      }
    );

    expect(result.reused).toBe(true);
    expect(result.id).toBeNull();
  });

  it("lists lightweight scene summaries only", async () => {
    const result = await listScenes(
      listClient([{
        id: row.id,
        source_beat_id: "beat_1",
        status: "DRAFT",
        blueprint: buildValidScene(),
        updated_at: row.updated_at
      }]),
      "user-1",
      row.series_id
    );

    expect(result[0].title).toBe("The Choice to Heal");
    expect(result[0]).not.toHaveProperty("blueprint");
  });

  it("updates scene status without arbitrary blueprint patching", async () => {
    const captured: Record<string, unknown> = {};
    const result = await updateSceneStatus(
      updateClient({
        id: row.id,
        status: "READY",
        updated_at: row.updated_at,
        archived_at: null
      }, captured),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.id,
        status: "READY"
      }
    );

    expect(result.status).toBe("READY");
    expect(captured).not.toHaveProperty("blueprint");
  });

  it("archives scene state explicitly", async () => {
    const captured: Record<string, unknown> = {};
    await updateSceneStatus(
      updateClient({
        id: row.id,
        status: "ARCHIVED",
        updated_at: row.updated_at,
        archived_at: "2026-09-28T04:00:00Z"
      }, captured),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.id,
        status: "ARCHIVED"
      }
    );

    expect(captured.status).toBe("ARCHIVED");
    expect(typeof captured.archived_at).toBe("string");
  });
});
