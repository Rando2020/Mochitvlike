import type { SupabaseClient } from "@supabase/supabase-js";
import { SceneScriptSchema } from "../schema";
import type { ScriptSummary } from "../types";
import { ScriptPersistenceError } from "./types";

export async function listScripts(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string,
  sceneId: string
): Promise<ScriptSummary[]> {
  const { data, error } = await supabase
    .from("scene_scripts")
    .select("id,version,status,script,updated_at")
    .eq("scene_id", sceneId)
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .order("version", { ascending: false });

  if (error) throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to list scripts.", error);

  return (data ?? []).map((row) => {
    const parsed = SceneScriptSchema.safeParse(row.script);
    if (!parsed.success) throw new ScriptPersistenceError("CORRUPT_STORED_SCRIPT", "Stored script failed validation.");

    return {
      id: row.id,
      version: row.version,
      status: row.status,
      estimatedDurationSeconds: parsed.data.estimatedDurationSeconds,
      updatedAt: row.updated_at
    };
  });
}
