import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SeriesBlueprintSchema } from "@/lib/series/schema";
import { createSeriesRecord } from "@/lib/series/persistence/createSeries";
import { listSeries } from "@/lib/series/persistence/listSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CreateSeriesRequestSchema = z.object({
  creationId: z.string().uuid().optional(),
  seriesBlueprint: SeriesBlueprintSchema,
  metadata: z.object({
    source: z.enum(["llm", "repaired", "fallback"]),
    schemaVersion: z.literal("1.0")
  }).strict()
}).strict();

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function authenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new SeriesPersistenceError(
      "UNAUTHENTICATED",
      "Authentication is required."
    );
  }

  return { supabase, user };
}

export async function POST(request: NextRequest) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_SERIES_BLUEPRINT", "Request body must contain valid JSON.");
  }

  const parsed = CreateSeriesRequestSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(400, "INVALID_SERIES_BLUEPRINT", "Series data failed validation.");
  }

  try {
    const { supabase, user } = await authenticatedClient();

    const series = await createSeriesRecord(supabase, {
      creatorId: user.id,
      creationId: parsed.data.creationId,
      seriesBlueprint: parsed.data.seriesBlueprint,
      metadata: parsed.data.metadata
    });

    return NextResponse.json({ series }, { status: 201 });
  } catch (error) {
    if (error instanceof SeriesPersistenceError && error.code === "UNAUTHENTICATED") {
      return apiError(401, error.code, "Authentication is required.");
    }

    return apiError(500, "SERIES_PERSISTENCE_FAILED", "Series could not be saved.");
  }
}

export async function GET() {
  try {
    const { supabase, user } = await authenticatedClient();
    const series = await listSeries(supabase, user.id);

    return NextResponse.json(
      { series },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof SeriesPersistenceError && error.code === "UNAUTHENTICATED") {
      return apiError(401, error.code, "Authentication is required.");
    }

    if (error instanceof SeriesPersistenceError && error.code === "CORRUPT_STORED_SERIES") {
      return apiError(500, error.code, "Stored series data is invalid.");
    }

    return apiError(500, "SERIES_PERSISTENCE_FAILED", "Series could not be loaded.");
  }
}
