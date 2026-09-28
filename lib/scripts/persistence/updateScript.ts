import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScriptStatus } from "../types";
import { ScriptPersistenceError } from "./types";

export async function updateScriptStatus(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesId: string;
    sceneId: string;
    scriptId: string;
    status: ScriptStatus;
  }
) {
  const updates = {
    status: input.status,
    archived_at: input.status === "ARCHIVED" ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from("scene_scripts")
    .update(updates)
    .eq("id", input.scriptId)
    .eq("scene_id", input.sceneId)
    .eq("series_id", input.seriesId)
    .eq("creator_id", input.creatorId)
    .select("id,version,status,updated_at,archived_at")
    .maybeSingle();

  if (error) throw new ScriptPersistenceError("SCRIPT_PERSISTENCE_FAILED", "Unable to update script.", error);
  if (!data) throw new ScriptPersistenceError("SCRIPT_NOT_FOUND", "Script was not found.");

  return {
    id: data.id,
    version: data.version,
    status: data.status as ScriptStatus,
    updatedAt: data.updated_at,
    archivedAt: data.archived_at as string | null
  };
}
