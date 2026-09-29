import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildVisualPlanningContext } from "@/lib/visual-planning/context/buildVisualPlanningContext";
import { generateVisualPlan, VisualPlanGenerationError } from "@/lib/visual-planning/generateVisualPlan";
import { getLatestVisualPlan } from "@/lib/visual-planning/persistence/getVisualPlan";
import { saveVisualPlan } from "@/lib/visual-planning/persistence/saveVisualPlan";
import { getScript } from "@/lib/scripts/persistence/getScript";
import { ScriptPersistenceError } from "@/lib/scripts/persistence/types";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BodySchema = z.object({ mode: z.literal("INITIAL") }).strict();

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string }> }
) {
  const { seriesId, sceneId, scriptId } = await params;
  const uuid = z.string().uuid();
  if (!uuid.safeParse(seriesId).success || !uuid.safeParse(sceneId).success || !uuid.safeParse(scriptId).success) {
    return fail(404, "VISUAL_PLAN_PARENT_NOT_FOUND", "Script was not found.");
  }

  let json: unknown;
  try { json = await request.json(); } catch { return fail(400, "INVALID_VISUAL_PLAN_REQUEST", "Request body must contain valid JSON."); }
  if (!BodySchema.safeParse(json).success) return fail(400, "INVALID_VISUAL_PLAN_REQUEST", "Visual plan request is invalid.");

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return fail(401, "UNAUTHENTICATED", "Authentication is required.");

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    const scene = await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);
    const script = await getScript(supabase, user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint);

    const existing = await getLatestVisualPlan(
      supabase, user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint, script.script
    );
    if (existing) return NextResponse.json({ visualPlan: existing }, { status: 200 });

    const version = 1;
    const context = buildVisualPlanningContext({
      seriesId, sceneId, scriptId, version,
      series: series.blueprint,
      scene: scene.blueprint,
      script: script.script
    });

    const generated = await generateVisualPlan({
      seriesId, sceneId, scriptId, version,
      series: series.blueprint,
      scene: scene.blueprint,
      script: script.script,
      context
    });

    const persisted = await saveVisualPlan(supabase, {
      creatorId: user.id, seriesId, sceneId, scriptId,
      plan: generated.plan,
      generationSource: generated.source
    });

    if (persisted.reused) {
      const raced = await getLatestVisualPlan(
        supabase, user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint, script.script
      );
      if (!raced) return fail(409, "VISUAL_PLAN_PERSISTENCE_RACE", "Visual plan exists but could not be reloaded.");
      return NextResponse.json({ visualPlan: raced }, { status: 200 });
    }

    return NextResponse.json({
      visualPlan: {
        id: persisted.id,
        version,
        status: persisted.status,
        plan: generated.plan,
        generationSource: generated.source
      }
    }, { status: 201 });
  } catch (caught) {
    if (
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND") ||
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND") ||
      (caught instanceof ScriptPersistenceError && caught.code === "SCRIPT_NOT_FOUND")
    ) return fail(404, "VISUAL_PLAN_PARENT_NOT_FOUND", "Script was not found.");

    if (caught instanceof VisualPlanGenerationError) {
      return fail(caught.code === "VISUAL_PLAN_PROVIDER_UNAVAILABLE" ? 503 : 422, caught.code, "Visual plan could not be safely developed.");
    }

    return fail(500, "VISUAL_PLAN_GENERATION_FAILED", "Visual plan could not be developed.");
  }
}
