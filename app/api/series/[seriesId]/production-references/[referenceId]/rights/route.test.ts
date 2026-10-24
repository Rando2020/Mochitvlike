import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import type { ProductionReferenceRecord, ReferenceProvenance } from "@/lib/production-references/types";
const { auth, owned, getReference, bibles, admin } = vi.hoisted(() => ({
  auth: vi.fn(), owned: vi.fn(), getReference: vi.fn(), bibles: vi.fn(), admin: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: auth } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: admin }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: owned }));
vi.mock("@/lib/production-frames/persistence", () => ({ getPerformanceBibles: bibles }));
vi.mock("@/lib/production-references/persistence", () => ({ getProductionReferenceRecord: getReference }));
import { PATCH } from "./route";
import { approveProductionReference } from "@/lib/production-references/service";
const rights: ReferenceProvenance = { source: "OWNED", creatorNameOrId: "Fixture artist", licenseIdOrDescription: "Fixture rights record",
  sourceUrlOrRecord: null, permissions: { productionUse: true, commercialUse: true, modelConditioning: true, redistribution: null }, projectSpecific: null, notes: null };
let record: ProductionReferenceRecord;
let payload: Record<string, unknown>;
let filters: Record<string, unknown>;
let race: (() => void) | undefined;
const db = { from: vi.fn(() => query) };
const query = {
  update: vi.fn((value: Record<string, unknown>) => { payload = value; filters = {}; return query; }),
  eq: vi.fn((key: string, value: unknown) => { filters[key] = value; return query; }),
  select: vi.fn(() => query),
  maybeSingle: vi.fn(async () => {
    race?.();
    if (filters.updated_at !== record.updatedAt || filters.status !== record.status) return { data: null, error: null };
    record = { ...record, ...payload, updatedAt: "2026-10-24T01:00:01Z" } as ProductionReferenceRecord;
    return { data: { id: record.id }, error: null };
  })
};
const params = { params: Promise.resolve({ seriesId: "series", referenceId: "reference" }) };
const request = (overrides: Record<string, unknown> = {}) => new NextRequest("https://example.com/api/rights", {
  method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: "2026-10-24T01:00:00Z", provenance: rights, ...overrides })
});
beforeEach(() => {
  vi.clearAllMocks(); race = undefined;
  auth.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  owned.mockResolvedValue({ status: "ACTIVE", blueprint: theWoundsWeKeep }); bibles.mockResolvedValue([]); admin.mockReturnValue(db);
  record = { id: "reference", seriesId: "series", type: "CHARACTER", status: "UPLOADED", source: "OWNED",
    storagePath: "users/owner/series/reference.png", assetUrl: "private://fixture", checksum: "a".repeat(64),
    benchmarkOnly: false, creatorApproved: false, approved: false, characterId: "char_orin", abilityId: null,
    locationId: null, propId: null, referenceRole: "FULL_BODY", abilitySlot: null, modelCompatibility: [],
    provenance: { ...rights, creatorNameOrId: null, permissions: { productionUse: null, commercialUse: null, modelConditioning: null, redistribution: null } },
    visualMetadata: { width: 100, height: 200, mimeType: "image/png", notes: "unchanged crop lineage" }, version: 1,
    replacesReferenceId: null, createdAt: "2026-10-24T01:00:00Z", updatedAt: "2026-10-24T01:00:00Z", archivedAt: null };
  getReference.mockImplementation(async () => structuredClone(record));
});
describe("explicit rights review", () => {
  it("completes unknown rights for separate approval without changing original metadata", async () => {
    const before = structuredClone(record);
    const result = await PATCH(request(), params);
    expect(result.status).toBe(200); expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await result.json()).toEqual({ reference: { id: "reference", status: "REVIEW_REQUIRED" } });
    expect(payload).toEqual({ provenance: rights, status: "REVIEW_REQUIRED", approved: false, creator_approved: false });
    expect(filters).toEqual({ id: "reference", creator_id: "owner", series_id: "series", status: "UPLOADED", updated_at: before.updatedAt });
    expect(record.visualMetadata).toEqual(before.visualMetadata); expect(record.checksum).toBe(before.checksum);
    expect(record.approved).toBe(false);
    await approveProductionReference({ admin: db as never, userId: "owner", seriesId: "series", referenceId: "reference", series: theWoundsWeKeep, performanceBibles: [] });
    expect(record.status).toBe("APPROVED");
  });
  it.each([null, false])("retains undecided or denied rights (%s) without approval", async permission => {
    const result = await PATCH(request({ provenance: { ...rights, permissions: { ...rights.permissions, modelConditioning: permission } } }), params);
    expect(result.status).toBe(200); expect(record.status).toBe("UPLOADED");
    await expect(approveProductionReference({ admin: db as never, userId: "owner", seriesId: "series", referenceId: "reference", series: theWoundsWeKeep, performanceBibles: [] })).rejects.toThrow("REFERENCE_NOT_PENDING_REVIEW");
  });
  it("requires authentication and ownership before a write", async () => {
    auth.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await PATCH(request(), params)).status).toBe(401); expect(admin).not.toHaveBeenCalled();
    owned.mockRejectedValueOnce(new SeriesPersistenceError("SERIES_NOT_FOUND", "Series was not found."));
    expect((await PATCH(request(), params)).status).toBe(404); expect(admin).not.toHaveBeenCalled();
    getReference.mockRejectedValueOnce(new Error("PRODUCTION_REFERENCE_NOT_FOUND"));
    expect((await PATCH(request(), params)).status).toBe(404);
    expect(getReference).toHaveBeenCalledWith(db, "owner", "series", "reference"); expect(query.update).not.toHaveBeenCalled();
  });
  it("rejects owner, source and metadata forgery", async () => {
    for (const overrides of [{ ownerId: "other" }, { notes: "overwrite lineage" }, { expectedUpdatedAt: undefined }]) {
      expect((await PATCH(request(overrides), params)).status).toBe(400);
    }
    expect((await PATCH(request({ provenance: { ...rights, source: "PUBLIC_DOMAIN" } }), params)).status).toBe(400);
    expect(query.update).not.toHaveBeenCalled();
  });
  it.each(["APPROVED", "ARCHIVED", "REJECTED"] as const)("does not rewrite %s assets", async status => {
    record.status = status; expect((await PATCH(request(), params)).status).toBe(409); expect(query.update).not.toHaveBeenCalled();
  });
  it("blocks archived shows and stale review revisions", async () => {
    owned.mockResolvedValueOnce({ status: "ARCHIVED" }); expect((await PATCH(request(), params)).status).toBe(409);
    record.updatedAt = "newer"; expect((await PATCH(request(), params)).status).toBe(409); expect(query.update).not.toHaveBeenCalled();
  });
  it("fails closed if approval wins the race", async () => {
    race = () => { record.status = "APPROVED"; };
    expect((await PATCH(request(), params)).status).toBe(409); expect(record.provenance.permissions.modelConditioning).toBeNull();
  });
  it("does not approve rights changed after approval validation", async () => {
    record.provenance = rights; record.status = "REVIEW_REQUIRED";
    race = () => { record.updatedAt = "newer"; record.provenance = { ...rights, permissions: { ...rights.permissions, modelConditioning: false } }; };
    await expect(approveProductionReference({ admin: db as never, userId: "owner", seriesId: "series", referenceId: "reference", series: theWoundsWeKeep, performanceBibles: [] })).rejects.toThrow("REFERENCE_CHANGED_RELOAD");
    expect(record.approved).toBe(false);
  });
  it("sanitizes storage/database failures", async () => {
    query.maybeSingle.mockRejectedValueOnce(new Error("secret database detail"));
    const result = await PATCH(request(), params); expect(result.status).toBe(503); expect(await result.text()).not.toContain("secret");
  });
});

describe("existing metadata and approval writers share the concurrency boundary", () => {
  const metadataRequest = () => new NextRequest("https://example.com/api/reference", { method: "PATCH", body: JSON.stringify({
    type: record.type, source: record.source, characterId: record.characterId, referenceRole: record.referenceRole,
    modelCompatibility: record.modelCompatibility, provenance: rights, notes: record.visualMetadata.notes,
    benchmarkOnly: false
  }) });
  it("retains metadata editing with owner-scoped compare-and-set", async () => {
    const { PATCH: patchMetadata } = await import("../route");
    expect((await patchMetadata(metadataRequest(), params)).status).toBe(200);
    expect(filters).toMatchObject({ creator_id: "owner", series_id: "series", status: "UPLOADED", updated_at: "2026-10-24T01:00:00Z" });
  });
  it("does not let legacy metadata overwrite a concurrent rights review or approval", async () => {
    const { PATCH: patchMetadata } = await import("../route");
    race = () => { record.updatedAt = "newer"; record.status = "APPROVED"; };
    expect((await patchMetadata(metadataRequest(), params)).status).toBe(409);
    expect(record.status).toBe("APPROVED");
  });
  it.each(["APPROVED", "ARCHIVED", "REJECTED"] as const)("blocks metadata rewriting and approval of %s", async status => {
    const { PATCH: patchMetadata } = await import("../route");
    record.status = status;
    expect((await patchMetadata(metadataRequest(), params)).status).toBe(409);
    await expect(approveProductionReference({ admin: db as never, userId: "owner", seriesId: "series", referenceId: "reference", series: theWoundsWeKeep, performanceBibles: [] })).rejects.toThrow("REFERENCE_NOT_PENDING_REVIEW");
    expect(query.update).not.toHaveBeenCalled();
  });
  it("blocks legacy metadata edits on archived shows", async () => {
    const { PATCH: patchMetadata } = await import("../route");
    owned.mockResolvedValueOnce({ status: "ARCHIVED" });
    expect((await patchMetadata(metadataRequest(), params)).status).toBe(409);
    expect(query.update).not.toHaveBeenCalled();
  });
});
