import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneScriptSchema } from "../schema";
import type { SceneScript } from "../types";
import { validateSceneScript } from "../validateSceneScript";
import {
  ScriptPersistenceError,
  type PersistedScript,
  type PersistedScriptRow
} from "./types";

const SELECT =
  "id,scene_id,series_id,creator_id,version,status,script,script_schema_version,generation_source,created_at,updated_at,archived_at";

function mapRow(
  row: PersistedScriptRow,
  series?: SeriesBlueprint,
  scene?: SceneBlueprint
): PersistedScript {
  const parsed = SceneScriptSchema.safeParse(row.script);
  if (!parsed.success) {
    throw new ScriptPersistenceError("CORRUPT_STORED_SCRIPT", "Stored script failed structural validation.");
  }

  const script = parsed.data as SceneScript;
  if (series && scene) {
    const result = validateSceneScript(script, series, scene, {
      scriptId: row.id,
      sceneId: row.scene_id,
      seriesId: row.series_id,
      version: row.version
    });
    if (!result.success) {
      throw new ScriptPersistenceError("CORRUPT_STORED_SCRIPT", "Stored script violated scene continuity.");
    }
  }

  return {
    id: row.id,
    sceneId: row.scene_id,
    seriesId: row.series_id,
    creatorId: row.creator_id,
    version: row.version,
    status: row.status,
    script,
    schemaVersion: row.script_schema_version,
    generationSource: row.generation_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}

export async function getScript(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  sceneId: string,
  scriptId: string,
  series?: SeriesBlueprint,
  scene?: SceneBlueprint
) {
  const { data, error } = await supabase
    .from("scene_scripts")
    .select(SELECT)
    .eq("id", scriptId)
    .eq("scene_id", sceneId)
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .maybeSingle();

  if (error) throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to read script.", error);
  if (!data) throw new ScriptPersistenceError("SCRIPT_NOT_FOUND", "Script was not found.");

  return mapRow(data as PersistedScriptRow, series, scene);
}

export async function getLatestScript(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  sceneId: string,
  series?: SeriesBlueprint,
  scene?: SceneBlueprint
) {
  const { data, error } = await supabase
    .from("scene_scripts")
    .select(SELECT)
    .eq("scene_id", sceneId)
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to read latest script.", error);
  return data ? mapRow(data as PersistedScriptRow, series, scene) : null;
}
