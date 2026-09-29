import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneBlueprintSchema } from "../schema";
import type { SceneBlueprint } from "../types";
import { validateSceneBlueprint } from "../validateSceneBlueprint";
import {
  ScenePersistenceError,
  type PersistedScene,
  type PersistedSceneRow
} from "./types";

function mapRow(row: PersistedSceneRow, seriesBlueprint?: SeriesBlueprint): PersistedScene {
  const parsed = SceneBlueprintSchema.safeParse(row.blueprint);

  if (!parsed.success) {
    throw new ScenePersistenceError("CORRUPT_STORED_SCENE", "Stored scene failed structural validation.");
  }

  const blueprint = parsed.data as SceneBlueprint;

  if (seriesBlueprint) {
    const validated = validateSceneBlueprint(blueprint, seriesBlueprint, {
      sceneId: row.id,
      seriesId: row.series_id,
      beatId: row.source_beat_id
    });

    if (!validated.success) {
      throw new ScenePersistenceError("CORRUPT_STORED_SCENE", "Stored scene violated series continuity.");
    }
  }

  return {
    id: row.id,
    seriesId: row.series_id,
    creatorId: row.creator_id,
    episodeKey: row.episode_key,
    sourceBeatId: row.source_beat_id,
    status: row.status,
    blueprint,
    schemaVersion: row.blueprint_schema_version,
    generationSource: row.generation_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}

const SELECT =
  "id,series_id,creator_id,episode_key,source_beat_id,status,blueprint,blueprint_schema_version,generation_source,created_at,updated_at,archived_at";

export async function getScene(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  sceneId: string,
  seriesBlueprint?: SeriesBlueprint
): Promise<PersistedScene> {
  const { data, error } = await supabase
    .from("series_scenes")
    .select(SELECT)
    .eq("id", sceneId)
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .maybeSingle();

  if (error) {
    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to read scene.", error);
  }

  if (!data) {
    throw new ScenePersistenceError("SCENE_NOT_FOUND", "Scene was not found.");
  }

  return mapRow(data as PersistedSceneRow, seriesBlueprint);
}

export async function getSceneByBeat(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  sourceBeatId: string,
  seriesBlueprint?: SeriesBlueprint
): Promise<PersistedScene | null> {
  const { data, error } = await supabase
    .from("series_scenes")
    .select(SELECT)
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .eq("episode_key", "episodeOne")
    .eq("source_beat_id", sourceBeatId)
    .maybeSingle();

  if (error) {
    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to read scene.", error);
  }

  return data ? mapRow(data as PersistedSceneRow, seriesBlueprint) : null;
}
