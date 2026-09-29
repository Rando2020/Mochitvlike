import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneBlueprint, SceneGenerationSource } from "../types";
import { ScenePersistenceError } from "./types";

export async function saveScene(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesId: string;
    scene: SceneBlueprint;
    generationSource: SceneGenerationSource;
  }
) {
  const { data, error } = await supabase
    .from("series_scenes")
    .insert({
      id: input.scene.id,
      series_id: input.seriesId,
      creator_id: input.creatorId,
      episode_key: input.scene.episodeKey,
      source_beat_id: input.scene.sourceBeatId,
      status: "DRAFT",
      blueprint: input.scene,
      blueprint_schema_version: "1.0",
      generation_source: input.generationSource
    })
    .select("id,source_beat_id,status,updated_at")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        id: null,
        sourceBeatId: input.scene.sourceBeatId,
        status: "DRAFT" as const,
        updatedAt: null,
        reused: true
      };
    }

    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to persist scene.", error);
  }

  if (!data) {
    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to persist scene.");
  }

  return {
    id: data.id as string,
    sourceBeatId: data.source_beat_id as string,
    status: data.status as "DRAFT",
    updatedAt: data.updated_at as string,
    reused: false
  };
}
