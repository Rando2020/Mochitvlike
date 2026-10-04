import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { validatePersistedSeriesBlueprint } from "@/lib/series/persistence/validatePersistedSeries";
import { mapProductionReferenceRow } from "@/lib/production-references/persistence";
import { signedProductionReferenceUrl } from "@/lib/production-references/storage";
import { approvalProblems, isApprovedProductionReference } from "@/lib/production-references/validation";
import type { ProductionReferenceRecord } from "@/lib/production-references/types";
import type { CastMember, SeriesBlueprint } from "@/lib/series/types";
import { BindingReferenceRoleSchema, characterVisualRevision, currentReferenceBinding } from "./reference-binding";
import { DirectionEditError, readDirectionImpact, seriesDirectionRevision } from "./edit";
import { EMPTY_CHARACTER_DIRECTION } from "./schema";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const revision = z.string().regex(/^[a-f0-9]{64}$/);
export const ReferenceBindingRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), referenceId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("approve"), referenceId: z.string().uuid(), expectedRevision: revision,
    visualRevision: revision, impactRevision: revision, reviewId: revision, acknowledgeIdentity: z.literal(true) }).strict()
]);
export type ReferenceBindingRequest = z.infer<typeof ReferenceBindingRequestSchema>;
export type ReferenceCandidate = { id: string; version: number; checksum: string; role: "PRIMARY_IDENTITY" | "FULL_BODY" | "TURNAROUND"; width: number; height: number };
export type ReferenceBindingReview = {
  expectedRevision: string; visualRevision: string; impactRevision: string; reviewId: string;
  characterName: string; direction: typeof EMPTY_CHARACTER_DIRECTION;
  visualConcept: string; visualDescription: string; alreadyCurrent: boolean;
  reference: ReferenceCandidate; currentReferenceId: string | null;
  impact: Array<{ label: string; count: number }>;
  previewUrl?: string;
};
function eligible(record: ProductionReferenceRecord, series: SeriesBlueprint, characterId: string) {
  return record.seriesId && record.type === "CHARACTER" && record.characterId === characterId &&
    BindingReferenceRoleSchema.safeParse(record.referenceRole).success &&
    isApprovedProductionReference(record) && !record.archivedAt &&
    approvalProblems(record, series, []).length === 0 &&
    /^[a-f0-9]{64}$/.test(record.checksum) && Number.isInteger(record.version) && record.version > 0;
}
function candidate(record: ProductionReferenceRecord): ReferenceCandidate {
  return { id: record.id, version: record.version, checksum: record.checksum, role: BindingReferenceRoleSchema.parse(record.referenceRole), width: record.visualMetadata.width, height: record.visualMetadata.height };
}
export async function referenceBindingCandidates(db: SupabaseClient, userId: string, seriesId: string, characterId: string, series: SeriesBlueprint) {
  const { data, error, count } = await db.from("production_reference_assets").select("*", { count: "exact" })
    .eq("creator_id", userId).eq("series_id", seriesId).eq("character_id", characterId).order("id").limit(201);
  if (error || !data || count !== data.length || data.length > 200) throw new DirectionEditError(503, "REFERENCES_UNAVAILABLE", "References could not be fully checked.");
  return data.map(mapProductionReferenceRow).filter(record => eligible(record, series, characterId)).map(candidate);
}
function assertHistory(member: CastMember) {
  const last = member.generationDirectionHistory?.at(-1);
  if (last && hash(last.direction ?? EMPTY_CHARACTER_DIRECTION) !== hash(member.generationDirection ?? EMPTY_CHARACTER_DIRECTION)) {
    throw new DirectionEditError(409, "DIRECTION_HISTORY_CONFLICT", "Character direction history needs review first.");
  }
}
export async function reviewReferenceBinding(db: SupabaseClient, userId: string, seriesId: string, characterId: string, request: ReferenceBindingRequest) {
  const series = await getSeries(db, userId, seriesId);
  if (series.creatorId !== userId) throw new DirectionEditError(404, "NOT_FOUND", "Character was not found.");
  if (series.status === "ARCHIVED" || series.archivedAt) throw new DirectionEditError(409, "ARCHIVED", "Restore this series before reviewing references.");
  const member = series.blueprint.cast.find(c => c.id === characterId);
  if (!member) throw new DirectionEditError(404, "NOT_FOUND", "Character was not found.");
  assertHistory(member);
  const visualRevision = characterVisualRevision(member);
  const expectedRevision = seriesDirectionRevision(series);
  const history = member.referenceBindingHistory ?? [];
  let replay = false;
  const receipt = (base: string, impact: string, visual: string) => hash([userId, seriesId, characterId, base, impact, visual, request.referenceId]);
  if (request.action === "approve") {
    if (request.reviewId !== receipt(request.expectedRevision, request.impactRevision, request.visualRevision)) throw new DirectionEditError(409, "REVIEW_CONFLICT", "Review this binding again before approving.");
    replay = history.at(-1)?.id === request.reviewId && !!currentReferenceBinding(member);
    if (!replay && (request.expectedRevision !== expectedRevision || request.visualRevision !== visualRevision)) throw new DirectionEditError(409, "REVISION_CONFLICT", "The show or character changed. Review the binding again.");
  }
  const { data, error } = await db.from("production_reference_assets").select("*").eq("creator_id", userId)
    .eq("series_id", seriesId).eq("character_id", characterId).eq("id", request.referenceId).maybeSingle();
  if (error || !data) throw new DirectionEditError(404, "REFERENCE_NOT_FOUND", "Reference was not found.");
  const reference = mapProductionReferenceRow(data);
  if (!eligible(reference, series.blueprint, characterId)) throw new DirectionEditError(409, "REFERENCE_NOT_ELIGIBLE", "Choose an approved primary, full-body, or turnaround reference with complete rights and image metadata.");
  if (replay) {
    const binding = currentReferenceBinding(member)!;
    if (binding.referenceChecksum !== reference.checksum || binding.referenceVersion !== reference.version || binding.sourceRole !== reference.referenceRole) throw new DirectionEditError(409, "REFERENCE_CHANGED", "The approved binding no longer matches this reference. Review again.");
    return { approved: true as const, visualRevision, referenceId: reference.id };
  }
  const { revision: impactRevision, impact } = await readDirectionImpact(db, userId, seriesId, characterId);
  // Include the selected row explicitly so the displayed asset cannot change
  // unnoticed even if an independent inventory read observes a later snapshot.
  const boundImpactRevision = hash([impactRevision, data]);
  const reviewId = receipt(expectedRevision, boundImpactRevision, visualRevision);
  const review: ReferenceBindingReview = { expectedRevision, visualRevision, impactRevision: boundImpactRevision, reviewId,
    characterName: member.name, direction: member.generationDirection ?? EMPTY_CHARACTER_DIRECTION,
    visualConcept: member.visualConcept, visualDescription: member.characterSheetSeed.visualDescription,
    alreadyCurrent: currentReferenceBinding(member)?.referenceId === reference.id && currentReferenceBinding(member)?.referenceChecksum === reference.checksum && currentReferenceBinding(member)?.referenceVersion === reference.version && currentReferenceBinding(member)?.sourceRole === reference.referenceRole,
    reference: candidate(reference), currentReferenceId: currentReferenceBinding(member)?.referenceId ?? null, impact };
  if (request.action === "review") {
    review.previewUrl = await signedProductionReferenceUrl(db, reference.storagePath, 600);
    return { review };
  }
  if (request.impactRevision !== boundImpactRevision || request.reviewId !== reviewId) throw new DirectionEditError(409, "IMPACT_CONFLICT", "Reference or production work changed. Review the updated binding before approving.");
  if (history.length >= 50) throw new DirectionEditError(409, "BINDING_HISTORY_LIMIT", "Binding history is full. No previous binding was discarded.");
  if (review.alreadyCurrent) {
    throw new DirectionEditError(409, "BINDING_ALREADY_CURRENT", "This reference is already bound to this visual revision.");
  }
  const next = structuredClone(series.blueprint);
  next.cast.find(c => c.id === characterId)!.referenceBindingHistory = [...history, {
    id: reviewId, visualRevision, referenceId: reference.id, referenceChecksum: reference.checksum, referenceVersion: reference.version,
    sourceRole: BindingReferenceRoleSchema.parse(reference.referenceRole), approvedBy: userId, approvedAt: new Date().toISOString()
  }];
  validatePersistedSeriesBlueprint(next);
  const { data: saved, error: saveError } = await db.from("series").update({ blueprint: next }).eq("id", seriesId)
    .eq("creator_id", userId).eq("updated_at", series.updatedAt).eq("status", series.status).select("id").maybeSingle();
  if (saveError) throw new DirectionEditError(503, "BINDING_SAVE_FAILED", "Approval could not be confirmed. Retry the exact reviewed binding safely.");
  if (!saved) throw new DirectionEditError(409, "REVISION_CONFLICT", "Another editor changed this show while approving. Review again.");
  return { approved: true as const, visualRevision, referenceId: reference.id };
}
