import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSeries } from "@/lib/series/persistence/getSeries";
import {
  archiveSeriesRecord,
  updateSeriesRecord
} from "@/lib/series/persistence/updateSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SeriesIdSchema = z.string().uuid();

const UpdateSeriesSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional()
}).strict().refine(
  (value) => value.title !== undefined || value.status !== undefined,
  "At least one update is required."
);

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function contextFor(seriesId: string) {
  if (!SeriesIdSchema.safeParse(seriesId).success) {
    throw new SeriesPersistenceError("SERIES_NOT_FOUND", "Series was not found.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new SeriesPersistenceError("UNAUTHENTICATED", "Authentication is required.");
  }

  return { supabase, user };
}

function mapError(error: unknown) {
  if (!(error instanceof SeriesPersistenceError)) {
    return apiError(500, "SERIES_PERSISTENCE_FAILED", "Series request failed.");
  }

  if (error.code === "UNAUTHENTICATED") {
    return apiError(401, error.code, "Authentication is required.");
  }

  if (error.code === "SERIES_NOT_FOUND") {
    return apiError(404, error.code, "Series was not found.");
  }

  if (error.code === "CORRUPT_STORED_SERIES") {
    return apiError(500, error.code, "Stored series data is invalid.");
  }

  return apiError(500, "SERIES_PERSISTENCE_FAILED", "Series request failed.");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;

  try {
    const { supabase, user } = await contextFor(seriesId);
    const series = await getSeries(supabase, user.id, seriesId);

    return NextResponse.json(
      {
        series: {
          id: series.id,
          title: series.title,
          status: series.status,
          blueprint: series.blueprint,
          schemaVersion: series.schemaVersion,
          generationSource: series.generationSource,
          createdAt: series.createdAt,
          updatedAt: series.updatedAt
        }
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return mapError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_SERIES_UPDATE", "Request body must contain valid JSON.");
  }

  const parsed = UpdateSeriesSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(400, "INVALID_SERIES_UPDATE", "Series update is invalid.");
  }

  try {
    const { supabase, user } = await contextFor(seriesId);

    const series = await updateSeriesRecord(supabase, {
      creatorId: user.id,
      seriesId,
      title: parsed.data.title,
      status: parsed.data.status
    });

    return NextResponse.json({ series }, { status: 200 });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;

  try {
    const { supabase, user } = await contextFor(seriesId);
    const series = await archiveSeriesRecord(supabase, user.id, seriesId);

    return NextResponse.json(
      {
        series: {
          id: series.id,
          status: series.status,
          archivedAt: series.archivedAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return mapError(error);
  }
}
