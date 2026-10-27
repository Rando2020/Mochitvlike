import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { getPerformanceBibles } from "@/lib/production-frames/persistence";
import { listProductionReferenceRecords } from "@/lib/production-references/persistence";
import { createProductionReference } from "@/lib/production-references/service";
import {
  fetchPinnedVeyaSource, VEYA_CHARACTER_ID, VEYA_SERIES_ID, VEYA_SOURCE_SHA256
} from "@/lib/production-references/veya-repo-source";

export const runtime = "nodejs";
const response = (status: number, code: string) =>
  NextResponse.json({ error: { code } }, { status, headers: { "Cache-Control": "private, no-store" } });

/**
 * Opt-in, zero-AI source import. The only fetch target is a pinned first-party
 * GitHub asset; all creator rights remain unknown and approval is impossible.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  if (seriesId !== VEYA_SERIES_ID) return response(404, "VEYA_IMPORT_NOT_AVAILABLE");
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return response(403, "CROSS_ORIGIN_IMPORT_FORBIDDEN");
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return response(401, "UNAUTHENTICATED");
  let series;
  try { series = await getSeries(supabase, user.id, seriesId); }
  catch { return response(404, "SERIES_NOT_FOUND"); }
  if (!series.blueprint.cast.some(c => c.id === VEYA_CHARACTER_ID))
    return response(404, "VEYA_CHARACTER_NOT_FOUND");

  try {
    const admin = createAdminSupabaseClient();
    const existing = await listProductionReferenceRecords(admin, user.id, seriesId);
    const source = existing.find(r => r.characterId === VEYA_CHARACTER_ID &&
      r.type === "CHARACTER" && r.referenceRole === "OTHER" &&
      r.checksum === VEYA_SOURCE_SHA256 && !["ARCHIVED", "REJECTED"].includes(r.status));
    if (source) return NextResponse.json({ reference: { id: source.id, status: source.status }, alreadyExists: true },
      { headers: { "Cache-Control": "private, no-store" } });
    const bytes = await fetchPinnedVeyaSource();
    const bibles = await getPerformanceBibles(supabase, user.id, seriesId, series.blueprint);
    const created = await createProductionReference({
      admin, userId: user.id, seriesId, series: series.blueprint, performanceBibles: bibles,
      file: { bytes, mimeType: "image/png" },
      metadata: {
        type: "CHARACTER", source: "SYNTHETIC", characterId: VEYA_CHARACTER_ID,
        referenceRole: "OTHER", benchmarkOnly: false, modelCompatibility: [],
        notes: "First-party GitHub source sheet imported for review. Rights and model-conditioning authorization not attested.",
        provenance: {
          source: "SYNTHETIC", creatorNameOrId: null, licenseIdOrDescription: null,
          sourceUrlOrRecord: null, projectSpecific: null,
          permissions: { productionUse: null, commercialUse: null, modelConditioning: null, redistribution: null },
          notes: "Synthetic reference candidate; creator must review rights separately."
        }
      }
    });
    return NextResponse.json({ reference: created, alreadyExists: false },
      { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("VEYA_SOURCE_")
      ? error.message : "VEYA_IMPORT_UNCONFIRMED";
    return response(503, code);
  }
}
