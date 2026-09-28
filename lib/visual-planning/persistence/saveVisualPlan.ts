import type { SupabaseClient } from "@supabase/supabase-js";
import type { VisualPlan, VisualPlanGenerationSource } from "../types";
import { VisualPlanPersistenceError } from "./types";

export async function saveVisualPlan(supabase: SupabaseClient, input: {
  creatorId: string; seriesId: string; sceneId: string; scriptId: string; plan: VisualPlan; generationSource: VisualPlanGenerationSource;
}) {
  const { data, error } = await supabase.from("scene_visual_plans").insert({
    id: input.plan.id, script_id: input.scriptId, scene_id: input.sceneId, series_id: input.seriesId,
    creator_id: input.creatorId, version: input.plan.version, status: "DRAFT", plan: input.plan,
    plan_schema_version: "1.0", generation_source: input.generationSource
  }).select("id,version,status,updated_at").single();

  if (error) {
    if ((error as { code?: string }).code === "23505") return { id: null, version: input.plan.version, status: "DRAFT" as const, updatedAt: null, reused: true };
    throw new VisualPlanPersistenceError("VISUAL_PLAN_PERSISTENCE_FAILED", "Unable to persist visual plan.", error);
  }
  return { id: data.id as string, version: data.version as number, status: data.status as "DRAFT", updatedAt: data.updated_at as string, reused: false };
}
