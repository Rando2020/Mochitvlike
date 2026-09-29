import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidScript } from "./fixtures";
import { getScript, getLatestScript } from "../persistence/getScript";
import { listScripts } from "../persistence/listScripts";
import { saveScript } from "../persistence/saveScript";
import { updateScriptStatus } from "../persistence/updateScript";

const row = {
  id: "33333333-3333-4333-8333-333333333333",
  scene_id: "11111111-1111-4111-8111-111111111111",
  series_id: "22222222-2222-4222-8222-222222222222",
  creator_id: "user-1",
  version: 1,
  status: "DRAFT",
  script: buildValidScript(),
  script_schema_version: "1.0",
  generation_source: "llm",
  created_at: "2026-09-28T00:00:00Z",
  updated_at: "2026-09-28T00:00:00Z",
  archived_at: null
};

function readClient(data: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data, error: null })
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function listClient(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: rows, error: null })
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

describe("script persistence", () => {
  it("reads an owned validated script", async () => {
    const result = await getScript(
      readClient(row),
      "user-1",
      row.series_id,
      row.scene_id,
      row.id,
      theWoundsWeKeep,
      buildValidScene()
    );
    expect(result.version).toBe(1);
  });

  it("returns null when no latest version exists", async () => {
    const result = await getLatestScript(readClient(null), "user-1", row.series_id, row.scene_id);
    expect(result).toBeNull();
  });

  it("lists summaries without full script JSON", async () => {
    const result = await listScripts(
      listClient([{ id: row.id, version: 1, status: "DRAFT", script: buildValidScript(), updated_at: row.updated_at }]),
      "user-1",
      row.series_id,
      row.scene_id
    );
    expect(result[0].estimatedDurationSeconds).toBe(18);
    expect(result[0]).not.toHaveProperty("script");
  });

  it("persists initial version one", async () => {
    const result = await saveScript(
      insertClient({ id: row.id, version: 1, status: "DRAFT", updated_at: row.updated_at }),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.scene_id,
        script: buildValidScript(),
        generationSource: "llm"
      }
    );
    expect(result.version).toBe(1);
    expect(result.reused).toBe(false);
  });

  it("treats a duplicate scene/version insert as reuse rather than overwrite", async () => {
    const result = await saveScript(
      insertClient(null, { code: "23505" }),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.scene_id,
        script: buildValidScript(),
        generationSource: "llm"
      }
    );
    expect(result.reused).toBe(true);
  });

  it("updates status without overwriting script history", async () => {
    const captured: Record<string, unknown> = {};
    await updateScriptStatus(
      updateClient({ id: row.id, version: 1, status: "APPROVED", updated_at: row.updated_at, archived_at: null }, captured),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.scene_id,
        scriptId: row.id,
        status: "APPROVED"
      }
    );
    expect(captured.status).toBe("APPROVED");
    expect(captured).not.toHaveProperty("script");
  });

  it("archives explicitly", async () => {
    const captured: Record<string, unknown> = {};
    await updateScriptStatus(
      updateClient({ id: row.id, version: 1, status: "ARCHIVED", updated_at: row.updated_at, archived_at: "now" }, captured),
      {
        creatorId: "user-1",
        seriesId: row.series_id,
        sceneId: row.scene_id,
        scriptId: row.id,
        status: "ARCHIVED"
      }
    );
    expect(typeof captured.archived_at).toBe("string");
  });
});
