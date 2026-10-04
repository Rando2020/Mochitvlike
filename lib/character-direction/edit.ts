import { createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSeries } from "@/lib/series/persistence/getSeries";
import type { PersistedSeries } from "@/lib/series/persistence/types";
import { validatePersistedSeriesBlueprint } from "@/lib/series/persistence/validatePersistedSeries";
import { CharacterDirectionSchema, EMPTY_CHARACTER_DIRECTION, type CharacterDirection } from "./schema";
import { hasCharacterDirection, directionLabels } from "./compile";
import { DIRECTION_CATALOG, type DirectionGroup } from "./catalog";

export class DirectionEditError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const DirectionEditRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), direction: CharacterDirectionSchema }).strict(),
  z.object({ action: z.literal("save"), direction: CharacterDirectionSchema, expectedRevision: revisionSchema,
    impactRevision: revisionSchema, reviewId: revisionSchema, acknowledgeImpact: z.literal(true) }).strict()
]);
export type DirectionEditRequest = z.infer<typeof DirectionEditRequestSchema>;
export type DirectionReview = {
  expectedRevision: string; impactRevision: string; reviewId: string;
  current: CharacterDirection; proposed: CharacterDirection;
  changes: Array<{ group: DirectionGroup; before: string; after: string }>;
  impact: Array<{ label: string; count: number }>;
  visualChanged: boolean;
};
function normalize(value: CharacterDirection): CharacterDirection {
  return { ...value, personality: [...value.personality].sort() };
}
function same(a: CharacterDirection | null | undefined, b: CharacterDirection | null | undefined) {
  return hash(normalize(a ?? EMPTY_CHARACTER_DIRECTION)) === hash(normalize(b ?? EMPTY_CHARACTER_DIRECTION));
}
const TABLES = [
  ["series_scenes", "Scene plans"], ["scene_scripts", "Scripts"], ["scene_visual_plans", "Visual plans"],
  ["storyboards", "Storyboards"], ["scene_animatics", "Animatics"], ["motion_plans", "Motion plans"],
  ["episode_assemblies", "Episode assemblies"], ["voice_casts", "Voice casts"],
  ["dialogue_audio_plans", "Dialogue audio plans"], ["sound_design_plans", "Sound plans"],
  ["production_frames", "Production frames"], ["production_reference_assets", "Character references"],
  ["character_performance_bibles", "Character performance bibles"]
] as const;

// Conservative series-wide inventory. No signed URLs, scripts, or storage paths
// leave this function. The digest notices changes, not just changes in counts.
async function inventory(db: SupabaseClient, userId: string, seriesId: string, characterId: string) {
  const snapshots: Array<{ table: string; label: string; rows: Record<string, unknown>[] }> = await Promise.all(TABLES.map(async ([table, label]) => {
    let query = db.from(table).select("*", { count: "exact" }).eq("creator_id", userId).eq("series_id", seriesId);
    if (table === "production_reference_assets" || table === "character_performance_bibles") query = query.eq("character_id", characterId);
    const { data, error, count } = await query.order("id").limit(201);
    if (error || !data || count !== data.length || data.length > 200) throw new DirectionEditError(503, "IMPACT_UNAVAILABLE", "Production impact could not be fully checked. Nothing was saved.");
    return { table, label, rows: data };
  }));
  for (const [table, label, parent, field] of [
    ["production_frame_generations", "Frame generation jobs", "production_frames", "production_frame_id"],
    ["dialogue_audio_generations", "Speech generation jobs", "dialogue_audio_plans", "dialogue_plan_id"]
  ] as const) {
    const ids = snapshots.find(item => item.table === parent)!.rows.map(row => row.id);
    if (!ids.length) continue;
    const { data, error, count } = await db.from(table).select("*", { count: "exact" }).eq("creator_id", userId).in(field, ids).order("id").limit(201);
    if (error || !data || count !== data.length || data.length > 200) throw new DirectionEditError(503, "IMPACT_UNAVAILABLE", "Generation jobs could not be fully checked. Nothing was saved.");
    snapshots.push({ table, label, rows: data });
  }
  return { revision: hash(snapshots), impact: snapshots.map(item => ({ label: item.label, count: item.rows.length })) };
}
export function seriesDirectionRevision(series: PersistedSeries) {
  return hash([series.id, series.creatorId, series.updatedAt, series.status, series.title, series.blueprint]);
}
export async function editCharacterDirection(db: SupabaseClient, userId: string, seriesId: string, characterId: string, request: DirectionEditRequest) {
  const series = await getSeries(db, userId, seriesId);
  if (series.creatorId !== userId) throw new DirectionEditError(404, "NOT_FOUND", "Character was not found.");
  if (series.status === "ARCHIVED" || series.archivedAt) throw new DirectionEditError(409, "ARCHIVED", "Restore this series before editing direction.");
  const member = series.blueprint.cast.find(c => c.id === characterId);
  if (!member) throw new DirectionEditError(404, "NOT_FOUND", "Character was not found.");
  const history = member.generationDirectionHistory ?? [];
  const last = history.at(-1);
  const proposed = normalize(request.direction);
  const current = normalize(member.generationDirection ?? EMPTY_CHARACTER_DIRECTION);
  if (last && !same(last.direction, current)) throw new DirectionEditError(409, "HISTORY_CONFLICT", "Stored direction history needs review before editing.");
  const expectedRevision = seriesDirectionRevision(series);
  if (request.action === "save") {
    const receipt = hash([seriesId, characterId, userId, request.expectedRevision, request.impactRevision, proposed]);
    if (receipt !== request.reviewId) throw new DirectionEditError(409, "REVIEW_CONFLICT", "Review this proposal again before saving.");
    // Safe retry after a lost response, but never acknowledge a superseded edit.
    if (last?.revision === receipt && same(last.direction, proposed)) return { saved: true as const, revision: expectedRevision, direction: current };
    if (request.expectedRevision !== expectedRevision) throw new DirectionEditError(409, "REVISION_CONFLICT", "This series changed. Review your proposal again; your choices have been kept.");
  }
  const { revision: impactRevision, impact } = await inventory(db, userId, seriesId, characterId);
  const changes = (Object.keys(DIRECTION_CATALOG) as DirectionGroup[]).filter(group => hash(current[group]) !== hash(proposed[group]))
    .map(group => ({ group, before: directionLabels(current, group).join(", ") || "Story default", after: directionLabels(proposed, group).join(", ") || "Story default" }));
  const visualChanged = changes.some(change => change.group === "body" || change.group === "clothing");
  const reviewId = hash([seriesId, characterId, userId, expectedRevision, impactRevision, proposed]);
  const review: DirectionReview = { expectedRevision, impactRevision, reviewId, current, proposed, changes, impact, visualChanged };
  if (request.action === "review") return { review };
  if (request.impactRevision !== impactRevision || request.reviewId !== reviewId) throw new DirectionEditError(409, "IMPACT_CONFLICT", "Production work changed. Review the updated impact before saving.");
  if (!changes.length) throw new DirectionEditError(409, "NO_CHANGES", "There are no direction changes to save.");
  if (history.length >= 50) throw new DirectionEditError(409, "HISTORY_LIMIT", "Direction history is full. No history was discarded.");
  const next = structuredClone(series.blueprint);
  const target = next.cast.find(c => c.id === characterId)!;
  if (hasCharacterDirection(proposed)) target.generationDirection = proposed;
  else delete target.generationDirection;
  target.generationDirectionHistory = [...history, { revision: reviewId, previous: member.generationDirection ?? null,
    direction: target.generationDirection ?? null, savedAt: new Date().toISOString(), visualChanged }];
  validatePersistedSeriesBlueprint(next);
  // Single atomic conditional update prevents two editors overwriting each other.
  // Production inventory is advisory, not a transaction lock on running workers.
  const { data, error } = await db.from("series").update({ blueprint: next })
    .eq("id", seriesId).eq("creator_id", userId).eq("updated_at", series.updatedAt)
    .eq("status", series.status).select("id,updated_at").maybeSingle();
  if (error) throw new DirectionEditError(503, "SAVE_FAILED", "Save could not be confirmed. Retry this reviewed proposal safely.");
  if (!data) throw new DirectionEditError(409, "REVISION_CONFLICT", "This series changed while saving. Review again; your choices have been kept.");
  return { saved: true as const, revision: seriesDirectionRevision({ ...series, blueprint: next, updatedAt: data.updated_at }), direction: proposed };
}
