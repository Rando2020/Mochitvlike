import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildScriptContext } from "@/lib/scripts/context/buildScriptContext";
import { generateSceneScript, ScriptGenerationError } from "@/lib/scripts/generateSceneScript";
import { getLatestScript } from "@/lib/scripts/persistence/getScript";
import { saveScript } from "@/lib/scripts/persistence/saveScript";
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
  { params }: { params: Promise<{ seriesId: string; sceneId: string }> }
) {
  const { seriesId, sceneId } = await params;
  if (!z.string().uuid().safeParse(seriesId).success || !z.string().uuid().safeParse(sceneId).success) {
    return fail(404, "SCRIPT_PARENT_NOT_FOUND", "Scene was not found.");
  }

  let json: unknown;
  try { json = await request.json(); } catch { return fail(400, "INVALID_SCRIPT_REQUEST", "Request body must contain valid JSON."); }
  if (!BodySchema.safeParse(json).success) return fail(400, "INVALID_SCRIPT_REQUEST", "Script request is invalid.");

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return fail(401, "UNAUTHENTICATED", "Authentication is required.");

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    const scene = await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);

    const existing = await getLatestScript(supabase, user.id, seriesId, sceneId, series.blueprint, scene.blueprint);
    if (existing) {
      return NextResponse.json({ script: existing }, { status: 200 });
    }

    const version = 1;
    const context = buildScriptContext({
      seriesId,
      sceneId,
      version,
      series: series.blueprint,
      scene: scene.blueprint
    });

    const generated = await generateSceneScript({
      seriesId,
      sceneId,
      version,
      series: series.blueprint,
      scene: scene.blueprint,
      context
    });

    const persisted = await saveScript(supabase, {
      creatorId: user.id,
      seriesId,
      sceneId,
      script: generated.script,
      generationSource: generated.source
    });

    if (persisted.reused) {
      const raced = await getLatestScript(supabase, user.id, seriesId, sceneId, series.blueprint, scene.blueprint);
      if (!raced) return fail(409, "SCRIPT_PERSISTENCE_RACE", "Script exists but could not be reloaded.");
      return NextResponse.json({ script: raced }, { status: 200 });
    }

    return NextResponse.json({
      script: {
        id: persisted.id,
        version,
        status: persisted.status,
        script: generated.script,
        generationSource: generated.source
      }
    }, { status: 201 });
  } catch (caught) {
    if (
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND") ||
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND")
    ) return fail(404, "SCRIPT_PARENT_NOT_FOUND", "Scene was not found.");

    if (caught instanceof ScriptGenerationError) {
      return fail(caught.code === "SCRIPT_PROVIDER_UNAVAILABLE" ? 503 : 422, caught.code, "Script could not be safely written.");
    }

    return fail(500, "SCRIPT_GENERATION_FAILED", "Script could not be written.");
  }
}
