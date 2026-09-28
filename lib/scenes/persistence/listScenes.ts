import type { SupabaseClient } from "@supabase/supabase-js";
import { SceneBlueprintSchema } from "../schema";
import type { SceneSummary } from "../types";
import { ScenePersistenceError } from "./types";

export async function listScenes(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string
): Promise<SceneSummary[]> {
  const { data, error } = await supabase
    .from("series_scenes")
    .select("id,source_beat_id,status,blueprint,updated_at")
    .eq("series_id", seriesId)
    .eq("creator_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ScenePersistenceError("SCENE_PERSISTENCE_FAILED", "Unable to list scenes.", error);
  }

  return (data ?? []).map((row) => {
    const parsed = SceneBlueprintSchema.safeParse(row.blueprint);
    if (!parsed.success) {
      throw new ScenePersistenceError("CORRUPT_STORED_SCENE", "Stored scene failed validation.");
    }

    return {
      id: row.id,
      sourceBeatId: row.source_beat_id,
      title: parsed.data.identity.title,
      status: row.status,
      updatedAt: row.updated_at
    } as SceneSummary;
  });
}
