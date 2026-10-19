import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { EMPTY_CHARACTER_DIRECTION } from "../schema";
import { editCharacterDirection, type DirectionReview } from "../edit";
import { characterVisualRevision, currentReferenceBinding } from "../reference-binding";
import { ReferenceBindingRequestSchema, referenceBindingCandidates, reviewReferenceBinding, type ReferenceBindingReview, type ReferenceBindingRequest } from "../review-reference-binding";

const owner = "11111111-1111-4111-8111-111111111111";
const seriesId = "22222222-2222-4222-8222-222222222222";
const refId = "33333333-3333-4333-8333-333333333333";
const secondRefId = "44444444-4444-4444-8444-444444444444";
function fixture() {
  const blueprint = structuredClone(theWoundsWeKeep);
  blueprint.cast[0].generationDirection = { ...EMPTY_CHARACTER_DIRECTION, body: "athletic" };
  blueprint.cast[0].generationDirectionHistory = [{ revision: "a".repeat(64), previous: null, direction: blueprint.cast[0].generationDirection, visualChanged: true, savedAt: "2026-10-04T00:00:00Z" }];
  const asset = (id: string, role: string) => ({ id, creator_id: owner, series_id: seriesId, character_id: "char_orin", type: "CHARACTER", reference_role: role,
    status: "APPROVED", source: "OWNED", storage_path: "users/owner/ref.png", asset_url: "storage://production-references/ref", checksum: "b".repeat(64),
    approved: true, creator_approved: true, benchmark_only: false, ability_id: null, ability_slot: null, location_id: null, prop_id: null,
    model_compatibility: [], provenance: { source: "OWNED", creatorNameOrId: owner, licenseIdOrDescription: "Owned original art", sourceUrlOrRecord: null,
      permissions: { productionUse: true, commercialUse: true, modelConditioning: true, redistribution: false }, projectSpecific: true, notes: null },
    width: 100, height: 200, mime_type: "image/png", notes: null, version: 1, replaces_reference_id: null, created_at: "2026-10-04T00:00:00Z", updated_at: "2026-10-04T00:00:00Z", archived_at: null });
  const rows: Record<string, any[]> = { series: [{ id: seriesId, creator_id: owner, title: "Show", slug: null, status: "DRAFT", blueprint,
    blueprint_schema_version: "1.0", generation_source: "llm", created_at: "2026-10-04T00:00:00Z", updated_at: "2026-10-04T00:00:00Z", archived_at: null }],
    production_reference_assets: [asset(refId, "PRIMARY_IDENTITY"), asset(secondRefId, "FULL_BODY")],
    production_frames: [{ id: "frame", creator_id: owner, series_id: seriesId, status: "READY", selected_generation_id: "output" }],
    production_frame_generations: [{ id: "output", creator_id: owner, production_frame_id: "frame", status: "COMPLETED", spec: { oldInputs: true }, output_url: "old-output" }]
  };
  const writes: string[] = [];
  const state = { loseResponse: false, finalConflict: false, failTable: "", truncate: false };
  let tick = 0;
  const db = { storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://private.example/temporary-preview" }, error: null }) }) },
    from: (table: string) => {
      const filters: Array<(row: any) => boolean> = []; let update: any;
      const get = () => {
        if (state.failTable === table) return { data: null, error: new Error("unavailable"), count: null };
        const selected = (rows[table] ?? []).filter(row => filters.every(filter => filter(row)));
        if (update) {
          if (state.finalConflict || !selected.length) return { data: null, error: null, count: 0 };
          writes.push(table); Object.assign(selected[0], structuredClone(update), { updated_at: `2026-10-04T00:00:${String(++tick).padStart(2, "0")}Z` });
          if (state.loseResponse) { state.loseResponse = false; return { data: null, error: new Error("lost response"), count: null }; }
        }
        return { data: structuredClone(selected), error: null, count: selected.length };
      };
      const chain = { select: () => chain, order: () => chain,
        eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return chain; },
        in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return chain; },
        update: (value: unknown) => { update = value; return chain; },
        limit: async () => { const result = get(); return state.truncate ? { ...result, count: (result.count ?? 0) + 1 } : result; },
        maybeSingle: async () => { const result = get(); return { data: result.data?.[0] ?? null, error: result.error }; }
      }; return chain;
    }
  } as unknown as SupabaseClient;
  return { db, rows, state, writes };
}
const member = (f: ReturnType<typeof fixture>) => f.rows.series[0].blueprint.cast[0];
async function review(f: ReturnType<typeof fixture>, referenceId = refId) {
  return (await reviewReferenceBinding(f.db, owner, seriesId, "char_orin", { action: "review", referenceId }) as { review: ReferenceBindingReview }).review;
}
const approve = (r: ReferenceBindingReview): ReferenceBindingRequest => ({ action: "approve", referenceId: r.reference.id,
  expectedRevision: r.expectedRevision, visualRevision: r.visualRevision, impactRevision: r.impactRevision, reviewId: r.reviewId, acknowledgeIdentity: true });
const apply = (f: ReturnType<typeof fixture>, r: ReferenceBindingReview) => reviewReferenceBinding(f.db, owner, seriesId, "char_orin", approve(r));

describe("Revision-bound identity approval", () => {
  it("previews the exact candidate, revision and impact without writing or exposing storage paths", async () => {
    const f = fixture(); const r = await review(f);
    expect(r.reference).toMatchObject({ id: refId, version: 1, checksum: "b".repeat(64) });
    expect(r.visualRevision).toBe(characterVisualRevision(member(f)));
    expect(r.impact).toContainEqual({ label: "Production frames", count: 1 });
    expect(r.previewUrl).toMatch(/^https:/); expect(JSON.stringify(r)).not.toContain("users/owner"); expect(f.writes).toEqual([]);
  });
  it("persists only a new binding and preserves approved assets, direction history, past specs and outputs", async () => {
    const f = fixture(); const before = structuredClone(f.rows); const r = await review(f, secondRefId); await apply(f, r);
    const persisted = await getSeries(f.db, owner, seriesId); const cast = persisted.blueprint.cast[0];
    expect(currentReferenceBinding(cast)).toMatchObject({ referenceId: secondRefId, sourceRole: "FULL_BODY", referenceVersion: 1, approvedBy: owner });
    const stripped = structuredClone(persisted.blueprint); delete stripped.cast[0].referenceBindingHistory;
    expect(stripped).toEqual(before.series[0].blueprint);
    expect(f.rows.production_reference_assets).toEqual(before.production_reference_assets);
    expect(f.rows.production_frames).toEqual(before.production_frames); expect(f.rows.production_frame_generations).toEqual(before.production_frame_generations); expect(f.writes).toEqual(["series"]);
  });
  it("rejects wrong owners and wrong character associations", async () => {
    const f = fixture(); await expect(reviewReferenceBinding(f.db, "other", seriesId, "char_orin", { action: "review", referenceId: refId })).rejects.toMatchObject({ code: "SERIES_NOT_FOUND" });
    await expect(reviewReferenceBinding(f.db, owner, seriesId, "char_mara", { action: "review", referenceId: refId })).rejects.toMatchObject({ code: "REFERENCE_NOT_FOUND" }); expect(f.writes).toEqual([]);
  });
  it("rejects unapproved, benchmark, missing rights, archived, and ineligible-role candidates", async () => {
    for (const override of [{ status: "REVIEW_REQUIRED" }, { benchmark_only: true }, { archived_at: "2026-10-04T00:00:00Z" }, { reference_role: "EXPRESSION" }, { provenance: { source: "OWNED", permissions: {} } }]) {
      const f = fixture(); Object.assign(f.rows.production_reference_assets[0], override);
      await expect(review(f)).rejects.toMatchObject({ code: "REFERENCE_NOT_ELIGIBLE" }); expect(f.writes).toEqual([]);
    }
  });
  it("strictly requires identity acknowledgment and server-managed ownership", () => {
    expect(ReferenceBindingRequestSchema.safeParse({ action: "review", referenceId: refId, approvedBy: owner }).success).toBe(false);
    expect(ReferenceBindingRequestSchema.safeParse({ action: "approve", referenceId: refId, acknowledgeIdentity: false }).success).toBe(false);
  });
  it("fails closed on changed reference version, approval or impact with unchanged counts", async () => {
    for (const mutate of [ (f: ReturnType<typeof fixture>) => { f.rows.production_reference_assets[0].version++; },
      (f: ReturnType<typeof fixture>) => { f.rows.production_reference_assets[0].status = "ARCHIVED"; },
      (f: ReturnType<typeof fixture>) => { f.rows.production_frame_generations[0].spec = { changed: true }; } ]) {
      const f = fixture(); const r = await review(f); mutate(f); await expect(apply(f, r)).rejects.toMatchObject({ status: 409 }); expect(f.writes).toEqual([]);
    }
  });
  it("rejects stale show and final compare-and-save conflicts", async () => {
    const f = fixture(); const r = await review(f); f.rows.series[0].title = "Changed";
    await expect(apply(f, r)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    const fresh = await review(f); f.state.finalConflict = true; await expect(apply(f, fresh)).rejects.toMatchObject({ code: "REVISION_CONFLICT" }); expect(f.writes).toEqual([]);
  });
  it("only one competing approval wins", async () => {
    const f = fixture(); const a = await review(f); const b = await review(f, secondRefId);
    const result = await Promise.allSettled([apply(f, a), apply(f, b)]);
    expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1); expect(member(f).referenceBindingHistory).toHaveLength(1); expect(f.writes).toEqual(["series"]);
  });
  it("retries lost responses without duplicate approval history", async () => {
    const f = fixture(); const r = await review(f); f.state.loseResponse = true;
    await expect(apply(f, r)).rejects.toMatchObject({ code: "BINDING_SAVE_FAILED" }); await expect(apply(f, r)).resolves.toMatchObject({ approved: true });
    expect(member(f).referenceBindingHistory).toHaveLength(1); expect(f.writes).toEqual(["series"]);
  });
  it("does not confirm a lost-response retry after the bound asset is archived", async () => {
    const f = fixture(); const r = await review(f); f.state.loseResponse = true; await expect(apply(f, r)).rejects.toMatchObject({ code: "BINDING_SAVE_FAILED" });
    f.rows.production_reference_assets[0].status = "ARCHIVED"; await expect(apply(f, r)).rejects.toMatchObject({ code: "REFERENCE_NOT_ELIGIBLE" }); expect(f.writes).toEqual(["series"]);
  });
  it("replaces the current binding by appending and rejects superseded approval replay", async () => {
    const f = fixture(); const first = await review(f); await apply(f, first); await apply(f, await review(f, secondRefId));
    expect(member(f).referenceBindingHistory).toHaveLength(2); expect(currentReferenceBinding(member(f))?.referenceId).toBe(secondRefId);
    await expect(apply(f, first)).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });
  it("keeps bindings valid for voice edits but requires fresh approval after body edits", async () => {
    const f = fixture(); await apply(f, await review(f)); const original = currentReferenceBinding(member(f));
    for (const changes of [{ voiceDelivery: "calm" as const }, { voiceDelivery: "calm" as const, body: "muscular" as const }]) {
      const r = (await editCharacterDirection(f.db, owner, seriesId, "char_orin", { action: "review", direction: { ...member(f).generationDirection, ...changes } }) as { review: DirectionReview }).review;
      await editCharacterDirection(f.db, owner, seriesId, "char_orin", { action: "save", direction: r.proposed, expectedRevision: r.expectedRevision, impactRevision: r.impactRevision, reviewId: r.reviewId, acknowledgeImpact: true });
      if (changes.body) expect(currentReferenceBinding(member(f))).toBeNull(); else expect(currentReferenceBinding(member(f))).toEqual(original);
    }
    expect(member(f).referenceBindingHistory).toHaveLength(1);
  });
  it("fails closed on incomplete candidate or impact reads and on archived shows", async () => {
    const f = fixture(); f.state.truncate = true;
    await expect(referenceBindingCandidates(f.db, owner, seriesId, "char_orin", f.rows.series[0].blueprint)).rejects.toMatchObject({ code: "REFERENCES_UNAVAILABLE" });
    f.state.truncate = false; f.state.failTable = "voice_casts"; await expect(review(f)).rejects.toMatchObject({ code: "IMPACT_UNAVAILABLE" });
    f.state.failTable = ""; f.rows.series[0].status = "ARCHIVED"; await expect(review(f)).rejects.toMatchObject({ code: "ARCHIVED" }); expect(f.writes).toEqual([]);
  });
  it("lists approved full-body assets without requiring the old primary to be archived", async () => {
    const f = fixture(); const candidates = await referenceBindingCandidates(f.db, owner, seriesId, "char_orin", f.rows.series[0].blueprint);
    expect(candidates.map(c => c.id)).toEqual([refId, secondRefId]); expect(f.rows.production_reference_assets.every(r => r.status === "APPROVED")).toBe(true);
  });
  it("reports an already-current binding and prevents redundant approval", async () => {
    const f = fixture(); await apply(f, await review(f)); const r = await review(f);
    expect(r.alreadyCurrent).toBe(true); await expect(apply(f, r)).rejects.toMatchObject({ code: "BINDING_ALREADY_CURRENT" }); expect(f.writes).toEqual(["series"]);
  });
  it("never truncates full binding history", async () => {
    const f = fixture(); const visualRevision = characterVisualRevision(member(f));
    member(f).referenceBindingHistory = Array.from({ length: 50 }, (_, index) => ({ id: index.toString(16).padStart(64, "0"), visualRevision,
      referenceId: secondRefId, referenceChecksum: "b".repeat(64), referenceVersion: 1, sourceRole: "FULL_BODY", approvedBy: owner, approvedAt: "2026-10-04T00:00:00Z" }));
    const r = await review(f); await expect(apply(f, r)).rejects.toMatchObject({ code: "BINDING_HISTORY_LIMIT" }); expect(member(f).referenceBindingHistory).toHaveLength(50); expect(f.writes).toEqual([]);
  });
});
