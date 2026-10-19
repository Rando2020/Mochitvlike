import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SheetViewRequestSchema } from "@/lib/production-references/sheet-view-schema";
import { prepareSheetView, SheetViewError } from "@/lib/production-references/sheet-view";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ seriesId: string; referenceId: string }> }) {
  const response = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return response({ error: { code: "UNAUTHENTICATED" } }, 401);
  const parsed = SheetViewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: { code: "INVALID_SHEET_VIEW" } }, 400);
  const { seriesId, referenceId } = await params;
  try {
    const series = await getSeries(db, user.id, seriesId);
    if (series.status === "ARCHIVED") return response({ error: { code: "SERIES_ARCHIVED" } }, 409);
    const result = await prepareSheetView({ admin: createAdminSupabaseClient(), userId: user.id, seriesId,
      sourceId: referenceId, series: series.blueprint, request: parsed.data });
    return response(result, parsed.data.action === "save" ? 201 : 200);
  } catch (caught) {
    if (caught instanceof SheetViewError) return response({ error: { code: caught.message } }, caught.status);
    const missing = caught instanceof Error && ["PRODUCTION_REFERENCE_NOT_FOUND", "SERIES_NOT_FOUND"].includes(caught.message);
    return response({ error: { code: "SHEET_VIEW_UNAVAILABLE" } }, missing ? 404 : 503);
  }
}
