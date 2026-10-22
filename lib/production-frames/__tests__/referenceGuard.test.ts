import { describe, expect, it } from "vitest";
import { productionFrameReferencesCurrent } from "../jobs/referenceGuard";
import type { ProductionReferenceAsset, ProductionFrameGenerationSpec } from "../types";

const active: ProductionReferenceAsset = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  type: "CHARACTER",
  assetUrl: "https://example.com/asset.png",
  storagePath: "users/creator/series/series-id/references/aaa/hash.png",
  checksum: "a".repeat(64),
  source: "OWNED",
  approved: true, benchmarkOnly: false, creatorApproved: true, status: "APPROVED",
  characterId: "character-orin", abilityId: null,
  modelCompatibility: ["animagine-xl-4.0"]
};
const spec: Pick<ProductionFrameGenerationSpec, "characters" | "references" | "model"> = {
  characters: [{
    characterId: "character-orin", name: "Orin", visualConcept: "healer",
    visualDescription: "original character", costumeRequirements: [],
    continuityConstraints: [], performanceBibleVersion: null,
    referenceAssetIds: [active.id]
  }],
  references: [{ ...active, referenceRole: "PRIMARY_IDENTITY" }],
  model: {
    modelId: "animagine-xl-4.0",
    revision: "2b7c1b397761bf5bd3cc42e5b39ec99314a75a96",
    architecture: "SDXL", developmentOverride: true
  }
};
const ready = (refs: readonly ProductionReferenceAsset[], frozen = spec) =>
  productionFrameReferencesCurrent(frozen, refs);

describe("reference approval at GPU-claim time", () => {
  it("accepts a live, matching creator-approved identity reference", () => {
    expect(ready([active])).toBe(true);
  });
  it("blocks a missing, archived, rejected, unapproved or benchmark-only reference", () => {
    expect(ready([])).toBe(false);
    for (const changes of [
      { status: "ARCHIVED" as const, approved: false },
      { status: "REJECTED" as const, approved: false },
      { approved: false },
      { creatorApproved: false },
      { benchmarkOnly: true }
    ]) expect(ready([{ ...active, ...changes }])).toBe(false);
  });
  it("blocks changed bytes, storage path, character or model compatibility", () => {
    for (const changes of [
      { checksum: "b".repeat(64) },
      { storagePath: "different/path.png" },
      { characterId: "somebody-else" },
      { modelCompatibility: ["illustrious-xl-v2.0"] }
    ]) expect(ready([{ ...active, ...changes }])).toBe(false);
  });
  it("does not treat a reference from another character as the identity source", () => {
    expect(ready([{ ...active, id: "other" }])).toBe(false);
    expect(ready([{ ...active }], { ...spec, characters: [{ ...spec.characters[0], referenceAssetIds: ["other"] }] })).toBe(false);
  });
  it("does not allow duplicate identity references in the job snapshot", () => {
    expect(ready([active], { ...spec, references: [active, active] })).toBe(false);
  });
  it("preserves a revision-attested full-body reference normalized as primary in the immutable spec", () => {
    expect(ready([{ ...active, referenceRole: "FULL_BODY" }])).toBe(true);
  });
  it("does not trust approval snapshots without a canonical storage path", () => {
    expect(ready([active], { ...spec, references: [{ ...active, storagePath: undefined }] })).toBe(false);
  });
});
