import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { VisualPlanSchema } from "../schema";
import { validateVisualPlan } from "../validateVisualPlan";
import type { PersistedVisualPlan, PersistedVisualPlanRow } from "./types";
import { VisualPlanPersistenceError } from "./types";

const SELECT = "id,script_id,scene_id,series_id,creator_id,version,status,plan,plan_schema_version,generation_source,created_at,updated_at,archived_at";

function mapRow(row: PersistedVisualPlanRow, series?: SeriesBlueprint, scene?: SceneBlueprint, script?: SceneScript): PersistedVisualPlan {
  const parsed = VisualPlanSchema.safeParse(row.plan);
  if (!parsed.success) throw new VisualPlanPersistenceError("CORRUPT_STORED_VISUAL_PLAN", "Stored visual plan failed structural validation.");
  if (series && scene && script) {
    const result = validateVisualPlan(parsed.data, series, scene, script, {
      planId: row.id, seriesId: row.series_id, sceneId: row.scene_id, scriptId: row.script_id, version: row.version
    });
    if (!result.success) throw new VisualPlanPersistenceError("CORRUPT_STORED_VISUAL_PLAN", "Stored visual plan violated continuity.");
  }
  return {
    id: row.id, scriptId: row.script_id, sceneId: row.scene_id, seriesId: row.series_id, creatorId: row.creator_id,
    version: row.version, status: row.status, plan: parsed.data, schemaVersion: row.plan_schema_version,
    generationSource: row.generation_source, createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at
  };
}

export async function getVisualPlan(supabase: SupabaseClient, userId: string, seriesId: string, sceneId: string, scriptId: string, planId: string, series?: SeriesBlueprint, scene?: SceneBlueprint, script?: SceneScript) {
  const { data, error } = await supabase.from("scene_visual_plans").select(SELECT)
    .eq("id", planId).eq("script_id", scriptId).eq("scene_id", sceneId).eq("series_id", seriesId).eq("creator_id", userId).maybeSingle();
  if (error) throw new VisualPlanPersistenceError("VISUAL_PLAN_PERSISTENCE_FAILED", "Unable to read visual plan.", error);
  if (!data) throw new VisualPlanPersistenceError("VISUAL_PLAN_NOT_FOUND", "Visual plan was not found.");
  return mapRow(data as PersistedVisualPlanRow, series, scene, script);
}

export async function getLatestVisualPlan(supabase: SupabaseClient, userId: string, seriesId: string, sceneId: string, scriptId: string, series?: SeriesBlueprint, scene?: SceneBlueprint, script?: SceneScript) {
  const { data, error } = await supabase.from("scene_visual_plans").select(SELECT)
    .eq("script_id", scriptId).eq("scene_id", sceneId).eq("series_id", seriesId).eq("creator_id", userId)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new VisualPlanPersistenceError("VISUAL_PLAN_PERSISTENCE_FAILED", "Unable to read latest visual plan.", error);
  return data ? mapRow(data as PersistedVisualPlanRow, series, scene, script) : null;
}
