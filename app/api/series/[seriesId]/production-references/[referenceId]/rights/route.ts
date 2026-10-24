import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { getPerformanceBibles } from "@/lib/production-frames/persistence";
import { getProductionReferenceRecord } from "@/lib/production-references/persistence";
import { ReferenceProvenanceSchema } from "@/lib/production-references/schema";
import { approvalProblems } from "@/lib/production-references/validation";

const RightsReviewSchema = z.object({
  expectedUpdatedAt: z.string().min(1).max(100),
  provenance: ReferenceProvenanceSchema
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ seriesId: string; referenceId: string }> }) {
  const response = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return response({ error: { code: "UNAUTHENTICATED" } }, 401);
  const parsed = RightsReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: { code: "INVALID_REFERENCE_RIGHTS" } }, 400);
  const { seriesId, referenceId } = await params;
  try {
    const series = await getSeries(db, user.id, seriesId);
    if (series.status === "ARCHIVED") return response({ error: { code: "SERIES_ARCHIVED" } }, 409);
    const admin = createAdminSupabaseClient();
    const current = await getProductionReferenceRecord(admin, user.id, seriesId, referenceId);
    if (!["UPLOADED", "REVIEW_REQUIRED"].includes(current.status) || current.updatedAt !== parsed.data.expectedUpdatedAt) {
      return response({ error: { code: "REFERENCE_CHANGED_RELOAD" } }, 409);
    }
    if (parsed.data.provenance.source !== current.source) return response({ error: { code: "REFERENCE_SOURCE_IMMUTABLE" } }, 400);
    const bibles = await getPerformanceBibles(db, user.id, seriesId, series.blueprint);
    const candidate = { ...current, provenance: parsed.data.provenance };
    const status = approvalProblems(candidate, series.blueprint, bibles).length ? "UPLOADED" : "REVIEW_REQUIRED";
    // Change only rights. In particular preserve original bytes, associations and crop lineage.
    // The existing trigger advances updated_at; this CAS also protects concurrent approval/archive.
    const { data, error: updateError } = await admin.from("production_reference_assets")
      .update({ provenance: candidate.provenance, status, approved: false, creator_approved: false })
      .eq("id", referenceId).eq("creator_id", user.id).eq("series_id", seriesId)
      .eq("status", current.status).eq("updated_at", current.updatedAt).select("id").maybeSingle();
    if (updateError) throw new Error("REFERENCE_RIGHTS_UNAVAILABLE");
    if (!data) return response({ error: { code: "REFERENCE_CHANGED_RELOAD" } }, 409);
    return response({ reference: { id: referenceId, status } }, 200);
  } catch (caught) {
    const missing = (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND") ||
      (caught instanceof Error && caught.message === "PRODUCTION_REFERENCE_NOT_FOUND");
    return response({ error: { code: missing ? "PRODUCTION_REFERENCE_NOT_FOUND" : "REFERENCE_RIGHTS_UNAVAILABLE" } }, missing ? 404 : 503);
  }
}
