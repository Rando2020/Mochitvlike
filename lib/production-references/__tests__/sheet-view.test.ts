import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { Blob } from "node:buffer";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { characterVisualRevision } from "@/lib/character-direction/reference-binding";
import { prepareSheetView, extractSheetView } from "../sheet-view";
import { referenceChecksum } from "../image";
import { SheetViewRequestSchema, readSheetViewLineage } from "../sheet-view-schema";

const { load, create } = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn() }));
vi.mock("../persistence", () => ({ getProductionReferenceRecord: load }));
vi.mock("../service", () => ({ createProductionReference: create }));
const id = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const seriesId = "33333333-3333-4333-8333-333333333333";
let bytes: Buffer;
let source: any;
let download: ReturnType<typeof vi.fn>;
let input: any;
beforeEach(async () => {
  vi.clearAllMocks();
  bytes = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#785abc" } }).png().toBuffer();
  source = { id, characterId: theWoundsWeKeep.cast[0].id, type: "CHARACTER", referenceRole: "OTHER", benchmarkOnly: false,
    status: "REVIEW_REQUIRED", checksum: referenceChecksum(bytes), version: 1,
    storagePath: `users/${owner}/series/${seriesId}/references/${id}/source.png`,
    visualMetadata: { width: 64, height: 64, mimeType: "image/png" }, source: "SYNTHETIC", modelCompatibility: [],
    provenance: { source: "SYNTHETIC", creatorNameOrId: "Fixture", licenseIdOrDescription: "Test only", projectSpecific: true,
      permissions: { productionUse: true, commercialUse: true, modelConditioning: true, redistribution: false }, notes: null, sourceUrlOrRecord: null } };
  load.mockImplementation(async () => structuredClone(source));
  create.mockResolvedValue({ id: "new-view", status: "REVIEW_REQUIRED" });
  download = vi.fn(async () => ({ data: new Blob([new Uint8Array(bytes)]), error: null }));
  input = { admin: { storage: { from: vi.fn(() => ({ download })) } }, userId: owner, seriesId, sourceId: id,
    series: structuredClone(theWoundsWeKeep), request: { action: "preview", sourceChecksum: source.checksum,
      crop: { left: 8, top: 4, width: 32, height: 40 }, referenceRole: "FULL_BODY", label: "Front" } };
});
describe("sheet view extraction", () => {
  it("extracts actual pixels without resizing or changing source bytes", async () => {
    const before = Buffer.from(bytes);
    const output = await extractSheetView(bytes, "image/png", input.request.crop);
    expect(bytes).toEqual(before);
    expect(await sharp(output).metadata()).toMatchObject({ width: 32, height: 40, format: "png" });
    expect(await sharp(output).raw().toBuffer()).toEqual(await sharp(bytes).extract(input.request.crop).raw().toBuffer());
  });
  it("rejects bounds, malformed images, and oversized decoded images", async () => {
    await expect(extractSheetView(bytes, "image/png", { left: 50, top: 0, width: 32, height: 32 })).rejects.toThrow("OUT_OF_BOUNDS");
    await expect(extractSheetView(bytes.subarray(0, 24), "image/png", input.request.crop)).rejects.toThrow("NORMALIZED_INPUT");
    const huge = Buffer.from(bytes); huge.writeUInt32BE(20000, 16); huge.writeUInt32BE(20000, 20);
    await expect(extractSheetView(huge, "image/png", input.request.crop)).rejects.toThrow("OUT_OF_BOUNDS");
  });
  it("rejects client ownership, URLs, fractional crops and save without preview revision", () => {
    for (const extra of [{ creatorId: owner }, { assetUrl: "https://evil.invalid" }, { crop: { ...input.request.crop, left: 0.1 } }, { action: "save" }]) {
      expect(SheetViewRequestSchema.safeParse({ ...input.request, ...extra }).success).toBe(false);
    }
  });
});
describe("owned source lineage and separate review", () => {
  it("preview reads the scoped source and never writes or approves", async () => {
    const result = await prepareSheetView(input);
    expect(load).toHaveBeenCalledWith(input.admin, owner, seriesId, id);
    expect(result).toMatchObject({ width: 32, height: 40, visualRevision: characterVisualRevision(input.series.cast[0]) });
    expect(create).not.toHaveBeenCalled();
  });
  it("save copies source rights and records exact geometry/version/revision without changing the source or canon", async () => {
    const before = structuredClone({ source, series: input.series });
    input.request = { ...input.request, action: "save", expectedVisualRevision: characterVisualRevision(input.series.cast[0]) };
    await prepareSheetView(input);
    const saved = create.mock.calls[0][0];
    expect(saved.metadata.provenance).toEqual(source.provenance);
    expect(saved.metadata).toMatchObject({ referenceRole: "FULL_BODY", characterId: source.characterId, source: "SYNTHETIC" });
    expect(saved.metadata.replacesReferenceId).toBeUndefined();
    expect(readSheetViewLineage(saved.metadata.notes)).toMatchObject({ sourceReferenceId: id, sourceChecksum: source.checksum,
      sourceVersion: 1, crop: input.request.crop, visualRevisionAtImport: input.request.expectedVisualRevision });
    expect({ source, series: input.series }).toEqual(before);
    expect(source.status).toBe("REVIEW_REQUIRED");
  });
  it("rejects a source owned by someone else before storage reads or inserts", async () => {
    load.mockRejectedValueOnce(new Error("PRODUCTION_REFERENCE_NOT_FOUND"));
    await expect(prepareSheetView(input)).rejects.toThrow("NOT_FOUND");
    expect(download).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
    source.storagePath = source.storagePath.replace(owner, "another-owner");
    await expect(prepareSheetView(input)).rejects.toThrow("NOT_FOUND");
    expect(download).not.toHaveBeenCalled();
  });
  it("rejects archived, rejected, benchmark, wrong association and non-source role", async () => {
    for (const change of [{ status: "ARCHIVED" }, { status: "REJECTED" }, { benchmarkOnly: true }, { characterId: "missing" }, { referenceRole: "PRIMARY_IDENTITY" }]) {
      load.mockResolvedValueOnce({ ...source, ...change });
      await expect(prepareSheetView(input)).rejects.toThrow("NOT_ELIGIBLE");
    }
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects stale visual revisions and changed source bytes/checksums", async () => {
    input.request = { ...input.request, action: "save", expectedVisualRevision: "b".repeat(64) };
    await expect(prepareSheetView(input)).rejects.toThrow("CHARACTER_CHANGED");
    input.request = { ...input.request, action: "preview", sourceChecksum: "b".repeat(64) };
    await expect(prepareSheetView(input)).rejects.toThrow("SOURCE_CHANGED");
    input.request.sourceChecksum = source.checksum; bytes[bytes.length - 1] ^= 1;
    await expect(prepareSheetView(input)).rejects.toThrow("SOURCE_CHANGED");
    expect(create).not.toHaveBeenCalled();
  });
  it("old assets without lineage remain readable", () => {
    for (const notes of [null, "Original drawing", "{}", '{"kind":"sheet-view-v1"}']) expect(readSheetViewLineage(notes)).toBeNull();
  });
});

it("rejects a large real PNG preview before returning base64 or saving a reference", async () => {
  bytes = await sharp(randomBytes(1024 * 1024 * 4), { raw: { width: 1024, height: 1024, channels: 4 } }).png().toBuffer();
  source.checksum = referenceChecksum(bytes);
  source.visualMetadata = { width: 1024, height: 1024, mimeType: "image/png" };
  input.request.sourceChecksum = source.checksum;
  input.request.crop = { left: 0, top: 0, width: 1024, height: 1024 };
  await expect(prepareSheetView(input)).rejects.toMatchObject({ status: 413, message: "SHEET_PREVIEW_TOO_LARGE" });
  expect(create).not.toHaveBeenCalled();
});
