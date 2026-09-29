import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneScript, ScriptGenerationSource } from "../types";
import { ScriptPersistenceError } from "./types";

export async function saveScript(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesId: string;
    sceneId: string;
    script: SceneScript;
    generationSource: ScriptGenerationSource;
  }
) {
  const { data, error } = await supabase
    .from("scene_scripts")
    .insert({
      id: input.script.id,
      scene_id: input.sceneId,
      series_id: input.seriesId,
      creator_id: input.creatorId,
      version: input.script.version,
      status: "DRAFT",
      script: input.script,
      script_schema_version: "1.0",
      generation_source: input.generationSource
    })
    .select("id,version,status,updated_at")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        id: null,
        version: input.script.version,
        status: "DRAFT" as const,
        updatedAt: null,
        reused: true
      };
    }
    throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to persist script.", error);
  }

  if (!data) throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to persist script.");

  return {
    id: data.id as string,
    version: data.version as number,
    status: data.status as "DRAFT",
    updatedAt: data.updated_at as string,
    reused: false
  };
}
