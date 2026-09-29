import type { SupabaseClient } from "@supabase/supabase-js";
import { VisualPlanSchema } from "../schema";
import type { VisualPlanSummary } from "../types";
import { VisualPlanPersistenceError } from "./types";

export async function listVisualPlans(supabase: SupabaseClient, userId: string, seriesId: string, sceneId: string, scriptId: string): Promise<VisualPlanSummary[]> {
  const { data, error } = await supabase.from("scene_visual_plans").select("id,version,status,plan,updated_at")
    .eq("script_id", scriptId).eq("scene_id", sceneId).eq("series_id", seriesId).eq("creator_id", userId)
    .order("version", { ascending: false });
  if (error) throw new VisualPlanPersistenceError("VISUAL_PLAN_PERSISTENCE_FAILED", "Unable to list visual plans.", error);
  return (data ?? []).map((row) => {
    const parsed = VisualPlanSchema.safeParse(row.plan);
    if (!parsed.success) throw new VisualPlanPersistenceError("CORRUPT_STORED_VISUAL_PLAN", "Stored visual plan failed validation.");
    return {
      id: row.id, version: row.version, status: row.status,
      visualBeatCount: parsed.data.visualBeats.length,
      estimatedDurationSeconds: parsed.data.visualBeats.reduce((sum, beat) => sum + beat.estimatedDurationSeconds, 0),
      updatedAt: row.updated_at
    };
  });
}
