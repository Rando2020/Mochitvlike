import type { SupabaseClient } from "@supabase/supabase-js";
import type { VisualPlanStatus } from "../types";
import { VisualPlanPersistenceError } from "./types";

export async function updateVisualPlanStatus(supabase: SupabaseClient, input: {
  creatorId: string; seriesId: string; sceneId: string; scriptId: string; planId: string; status: VisualPlanStatus;
}) {
  const { data, error } = await supabase.from("scene_visual_plans").update({
    status: input.status,
    archived_at: input.status === "ARCHIVED" ? new Date().toISOString() : null
  }).eq("id", input.planId).eq("script_id", input.scriptId).eq("scene_id", input.sceneId).eq("series_id", input.seriesId).eq("creator_id", input.creatorId)
    .select("id,version,status,updated_at,archived_at").maybeSingle();

  if (error) throw new VisualPlanPersistenceError("VISUAL_PLAN_PERSISTENCE_FAILED", "Unable to update visual plan.", error);
  if (!data) throw new VisualPlanPersistenceError("VISUAL_PLAN_NOT_FOUND", "Visual plan was not found.");
  return { id: data.id, version: data.version, status: data.status as VisualPlanStatus, updatedAt: data.updated_at, archivedAt: data.archived_at as string | null };
}
