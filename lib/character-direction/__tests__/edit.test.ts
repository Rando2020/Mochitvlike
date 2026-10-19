import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { DirectionEditRequestSchema, editCharacterDirection, type DirectionEditRequest, type DirectionReview } from "../edit";
import { EMPTY_CHARACTER_DIRECTION, type CharacterDirection } from "../schema";
import { DirectionHistorySchema } from "../history";

function fixture() {
  const rows: Record<string, Record<string, any>[]> = { series: [{ id: "show", creator_id: "owner", title: "Show", slug: null, status: "DRAFT",
    blueprint: structuredClone(theWoundsWeKeep), blueprint_schema_version: "1.0", generation_source: "llm",
    created_at: "2026-10-04T00:00:00Z", updated_at: "2026-10-04T00:00:00Z", archived_at: null }],
    production_reference_assets: [{ id: "ref", series_id: "show", creator_id: "owner", character_id: "char_mara", status: "APPROVED", checksum: "keep-this" }],
    dialogue_audio_plans: [{ id: "plan", series_id: "show", creator_id: "owner", plan: { original: true } }],
    dialogue_audio_generations: [{ id: "speech", dialogue_plan_id: "plan", creator_id: "owner", status: "PENDING", instructions: "original" }]
  };
  let tick = 0;
  const writes: string[] = [];
  const state = { failedTable: "", loseResponse: false, conflictOnWrite: false, overflow: false };
  const db = { from: (table: string) => {
    const filters: Array<(row: Record<string, any>) => boolean> = [];
    let update: any;
    const result = () => {
      if (state.failedTable === table) return { data: null, error: new Error("unavailable") };
      const selected = (rows[table] ?? []).filter(row => filters.every(filter => filter(row)));
      if (update) {
        if (state.conflictOnWrite) return { data: null, error: null };
        if (!selected.length) return { data: null, error: null };
        writes.push(table);
        Object.assign(selected[0], structuredClone(update), { updated_at: `2026-10-04T00:00:${String(++tick).padStart(2, "0")}Z` });
        if (state.loseResponse) { state.loseResponse = false; return { data: null, error: new Error("lost response") }; }
      }
      return { data: structuredClone(selected), error: null, count: selected.length };
    };
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters.push(row => key === "blueprint" ? JSON.stringify(row[key]) === value : row[key] === value); return chain; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return chain; },
      update: (value: unknown) => { update = value; return chain; },
      order: () => chain,
      limit: async () => state.overflow ? { data: Array(201).fill({}), error: null } : result(),
      maybeSingle: async () => { const value = result(); return { data: value.data?.[0] ?? null, error: value.error }; }
    };
    return chain;
  } } as unknown as SupabaseClient;
  return { db, rows, writes, state };
}
const direction = { ...EMPTY_CHARACTER_DIRECTION, personality: ["guarded" as const], voiceDelivery: "calm" as const };
async function review(f: ReturnType<typeof fixture>, proposed: CharacterDirection = direction) {
  const value = await editCharacterDirection(f.db, "owner", "show", "char_mara", { action: "review", direction: proposed });
  return (value as { review: DirectionReview }).review;
}
function save(r: DirectionReview): DirectionEditRequest {
  return { action: "save", direction: r.proposed, expectedRevision: r.expectedRevision, impactRevision: r.impactRevision, reviewId: r.reviewId, acknowledgeImpact: true };
}
describe("Existing cast direction review and persistence", () => {
  it("rejects inconsistent history and a falsified visual-change marker", () => {
    const entry = { revision: "a".repeat(64), previous: null, direction: { ...direction, body: "athletic" }, savedAt: "2026-10-04T00:00:00Z", visualChanged: false };
    expect(DirectionHistorySchema.safeParse([entry]).success).toBe(false);
    expect(DirectionHistorySchema.safeParse([{ ...entry, visualChanged: true }, { ...entry, revision: "b".repeat(64), visualChanged: true }]).success).toBe(false);
  });
  it("reviews an untagged non-protagonist without writing and lists production work", async () => {
    const f = fixture(); const r = await review(f);
    expect(r.changes.map(c => c.group)).toEqual(["personality", "voiceDelivery"]);
    expect(r.current).toEqual(EMPTY_CHARACTER_DIRECTION);
    expect(r.impact).toContainEqual({ label: "Character references", count: 1 });
    expect(r.impact).toContainEqual({ label: "Speech generation jobs", count: 1 });
    expect(f.writes).toEqual([]);
  });
  it("saves only direction, persists after reload, and preserves approved assets, queued inputs, canon and other cast", async () => {
    const f = fixture(); const before = structuredClone(f.rows); const r = await review(f);
    await editCharacterDirection(f.db, "owner", "show", "char_mara", save(r));
    const reloaded = await getSeries(f.db, "owner", "show");
    const target = reloaded.blueprint.cast.find(c => c.id === "char_mara")!;
    expect(target.generationDirection).toEqual(direction);
    expect(target.generationDirectionHistory).toHaveLength(1);
    expect(target.generationDirectionHistory![0].previous).toBeNull();
    const restored = structuredClone(reloaded.blueprint);
    const cast = restored.cast.find(c => c.id === "char_mara")!;
    delete cast.generationDirection; delete cast.generationDirectionHistory;
    expect(restored).toEqual(before.series[0].blueprint);
    expect(f.rows.production_reference_assets).toEqual(before.production_reference_assets);
    expect(f.rows.dialogue_audio_generations).toEqual(before.dialogue_audio_generations);
    expect(f.rows.dialogue_audio_plans).toEqual(before.dialogue_audio_plans);
    expect(f.writes).toEqual(["series"]);
  });
  it("rejects a different owner without writing", async () => {
    const f = fixture(); await expect(editCharacterDirection(f.db, "intruder", "show", "char_mara", { action: "review", direction })).rejects.toMatchObject({ code: "SERIES_NOT_FOUND" });
    expect(f.writes).toEqual([]);
  });
  it("rejects missing cast and archived series", async () => {
    const f = fixture(); await expect(editCharacterDirection(f.db, "owner", "show", "missing", { action: "review", direction })).rejects.toMatchObject({ status: 404 });
    f.rows.series[0].status = "ARCHIVED"; await expect(review(f)).rejects.toMatchObject({ code: "ARCHIVED" });
  });
  it("rejects stale revision before applying", async () => {
    const f = fixture(); const r = await review(f); f.rows.series[0].blueprint.identity.title = "Another editor";
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).rejects.toMatchObject({ code: "REVISION_CONFLICT" }); expect(f.writes).toEqual([]);
  });
  it("rejects changed production status even when counts are unchanged", async () => {
    const f = fixture(); const r = await review(f); f.rows.dialogue_audio_generations[0].status = "COMPLETED";
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).rejects.toMatchObject({ code: "IMPACT_CONFLICT" }); expect(f.writes).toEqual([]);
  });
  it("fails closed on missing impact tables or truncated inventory", async () => {
    const f = fixture(); f.state.failedTable = "voice_casts"; await expect(review(f)).rejects.toMatchObject({ code: "IMPACT_UNAVAILABLE" });
    f.state.failedTable = ""; f.state.overflow = true; await expect(review(f)).rejects.toMatchObject({ code: "IMPACT_UNAVAILABLE" }); expect(f.writes).toEqual([]);
  });
  it("detects the final atomic update race", async () => {
    const f = fixture(); const r = await review(f); f.state.conflictOnWrite = true;
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).rejects.toMatchObject({ code: "REVISION_CONFLICT" }); expect(f.writes).toEqual([]);
  });
  it("allows only one of two simultaneous saves", async () => {
    const f = fixture(); const r = await review(f); const r2 = await review(f, { ...direction, voiceDelivery: "firm" });
    const results = await Promise.allSettled([editCharacterDirection(f.db, "owner", "show", "char_mara", save(r)), editCharacterDirection(f.db, "owner", "show", "char_mara", save(r2))]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1); expect(f.writes).toEqual(["series"]);
  });
  it("confirms a lost-response retry without duplicating history", async () => {
    const f = fixture(); const r = await review(f); f.state.loseResponse = true;
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).rejects.toMatchObject({ code: "SAVE_FAILED" });
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).resolves.toMatchObject({ saved: true }); expect(f.writes).toEqual(["series"]);
  });
  it("preserves history when clearing tags and rejects superseded retries", async () => {
    const f = fixture(); const first = await review(f); await editCharacterDirection(f.db, "owner", "show", "char_mara", save(first));
    const clear = await review(f, { ...EMPTY_CHARACTER_DIRECTION, personality: [] });
    await editCharacterDirection(f.db, "owner", "show", "char_mara", save(clear));
    const cast = f.rows.series[0].blueprint.cast.find((c: any) => c.id === "char_mara");
    expect(cast.generationDirection).toBeUndefined(); expect(cast.generationDirectionHistory[1].previous).toEqual(direction);
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(first))).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });
  it("requires acknowledgment, strict tags, and unchanged reviewed proposal", async () => {
    const f = fixture(); const r = await review(f); const request = save(r);
    expect(DirectionEditRequestSchema.safeParse({ ...request, acknowledgeImpact: false }).success).toBe(false);
    expect(DirectionEditRequestSchema.safeParse({ ...request, blueprint: {} }).success).toBe(false);
    expect(DirectionEditRequestSchema.safeParse({ action: "review", direction: { ...direction, body: "made-up" } }).success).toBe(false);
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", { ...request, direction: EMPTY_CHARACTER_DIRECTION })).rejects.toMatchObject({ code: "REVIEW_CONFLICT" });
  });
  it("records visual changes without touching the approved reference", async () => {
    const f = fixture(); const original = structuredClone(f.rows.production_reference_assets); const r = await review(f, { ...direction, body: "athletic" });
    expect(r.visualChanged).toBe(true); await editCharacterDirection(f.db, "owner", "show", "char_mara", save(r));
    expect(f.rows.production_reference_assets).toEqual(original);
    expect(f.rows.series[0].blueprint.cast.find((c: any) => c.id === "char_mara").generationDirectionHistory[0].visualChanged).toBe(true);
  });
  it("refuses no-op edits and never truncates full history", async () => {
    const f = fixture(); const none = await review(f, { ...EMPTY_CHARACTER_DIRECTION, personality: [] });
    await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(none))).rejects.toMatchObject({ code: "NO_CHANGES" });
    const member = f.rows.series[0].blueprint.cast.find((c: any) => c.id === "char_mara");
    member.generationDirectionHistory = Array.from({ length: 50 }, () => ({ revision: "a".repeat(64), previous: null, direction: null, savedAt: "2026-10-04T00:00:00Z", visualChanged: false }));
    const r = await review(f); await expect(editCharacterDirection(f.db, "owner", "show", "char_mara", save(r))).rejects.toMatchObject({ code: "HISTORY_LIMIT" }); expect(member.generationDirectionHistory).toHaveLength(50);
  });
});
