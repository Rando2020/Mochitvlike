import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSceneContext, SceneContextError } from "@/lib/scenes/context/buildSceneContext";
import {
  generateSceneBlueprint,
  SceneGenerationError
} from "@/lib/scenes/generateSceneBlueprint";
import { getSceneByBeat } from "@/lib/scenes/persistence/getScene";
import { saveScene } from "@/lib/scenes/persistence/saveScene";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const RequestSchema = z.object({
  episodeKey: z.literal("episodeOne"),
  beatId: z.string().trim().min(1).max(100)
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;

  if (!z.string().uuid().safeParse(seriesId).success) {
    return errorResponse(404, "SERIES_NOT_FOUND", "Series was not found.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_SCENE_REQUEST", "Request body must contain valid JSON.");
  }

  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(400, "INVALID_SCENE_REQUEST", "Scene generation request is invalid.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  try {
    const series = await getSeries(supabase, user.id, seriesId);

    const existing = await getSceneByBeat(
      supabase,
      user.id,
      series.id,
      parsed.data.beatId,
      series.blueprint
    );

    if (existing) {
      return NextResponse.json(
        {
          scene: {
            id: existing.id,
            status: existing.status,
            blueprint: existing.blueprint,
            generationSource: existing.generationSource
          }
        },
        { status: 200 }
      );
    }

    const context = buildSceneContext(
      series.id,
      series.blueprint,
      parsed.data.episodeKey,
      parsed.data.beatId
    );

    const generated = await generateSceneBlueprint({
      seriesId: series.id,
      beatId: parsed.data.beatId,
      seriesBlueprint: series.blueprint,
      context
    });

    const persisted = await saveScene(supabase, {
      creatorId: user.id,
      seriesId: series.id,
      scene: generated.scene,
      generationSource: generated.source
    });

    if (persisted.reused) {
      const raced = await getSceneByBeat(
        supabase,
        user.id,
        series.id,
        parsed.data.beatId,
        series.blueprint
      );

      if (!raced) {
        return errorResponse(409, "SCENE_PERSISTENCE_RACE", "Scene already exists but could not be reloaded.");
      }

      return NextResponse.json(
        {
          scene: {
            id: raced.id,
            status: raced.status,
            blueprint: raced.blueprint,
            generationSource: raced.generationSource
          }
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        scene: {
          id: persisted.id,
          status: persisted.status,
          blueprint: generated.scene,
          generationSource: generated.source
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND") {
      return errorResponse(404, "SERIES_NOT_FOUND", "Series was not found.");
    }

    if (error instanceof SceneContextError && error.code === "UNKNOWN_BEAT") {
      return errorResponse(404, "SCENE_BEAT_NOT_FOUND", "Episode beat was not found.");
    }

    if (error instanceof SceneGenerationError) {
      const status = error.code === "SCENE_PROVIDER_UNAVAILABLE" ? 503 : 422;
      return errorResponse(status, error.code, "Scene could not be safely developed.");
    }

    return errorResponse(500, "SCENE_GENERATION_FAILED", "Scene could not be developed.");
  }
}
