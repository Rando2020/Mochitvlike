import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneStatus } from "../types";
import { ScenePersistenceError } from "./types";

export async function updateSceneStatus(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesId: string;
    sceneId: string;
    status: SceneStatus;
  }
) {
  const updates: Record<string, unknown> = {
    status: input.status,
    archived_at: input.status === "ARCHIVED" ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from("series_scenes")
    .update(updates)
    .eq("id", input.sceneId)
    .eq("series_id", input.seriesId)
    .eq("creator_id", input.creatorId)
    .select("id,status,updated_at,archived_at")
    .maybeSingle();

  if (error) {
    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to update scene.", error);
  }

  if (!data) {
    throw new ScenePersistenceError("SCENE_NOT_FOUND", "Scene was not found.");
  }

  return {
    id: data.id,
    status: data.status as SceneStatus,
    updatedAt: data.updated_at,
    archivedAt: data.archived_at as string | null
  };
}
