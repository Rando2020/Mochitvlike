import { describe, expect, it } from "vitest";
import { checkSheetCropPlan } from "../sheet-crop-plan";

const scope = {
  seriesId: "70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892",
  characterId: "char_veya", checksum: "a".repeat(64), width: 1448, height: 1086
};
const plan = {
  format: "crayvo-sheet-crop-plan-v1",
  seriesId: scope.seriesId, characterId: scope.characterId,
  source: { sha256: scope.checksum, width: scope.width, height: scope.height },
  views: [
    { file: "front.png", label: "Front body", referenceRole: "FULL_BODY", crop: { left: 394, top: 40, width: 133, height: 407 } },
    { file: "face.png", label: "Face", referenceRole: "EXPRESSION", crop: { left: 946, top: 39, width: 329, height: 211 } }
  ]
};

describe("offline crop plan intake", () => {
  it("accepts an exact matching source and supported existing roles only", () => {
    const result = checkSheetCropPlan(plan, scope);
    expect(result.views).toHaveLength(2);
    expect(result.views[0].referenceRole).toBe("FULL_BODY");
  });
  it("rejects another series or character, including a plan with the right image hash", () => {
    expect(() => checkSheetCropPlan({ ...plan, seriesId: "22222222-2222-4222-8222-222222222222" }, scope)).toThrow("CROP_PLAN_WRONG_CHARACTER");
    expect(() => checkSheetCropPlan({ ...plan, characterId: "char_nox" }, scope)).toThrow("CROP_PLAN_WRONG_CHARACTER");
  });
  it("rejects a replaced source, mismatched dimensions, and all out-of-bounds crops", () => {
    expect(() => checkSheetCropPlan({ ...plan, source: { ...plan.source, sha256: "b".repeat(64) } }, scope)).toThrow("CROP_PLAN_SOURCE_MISMATCH");
    expect(() => checkSheetCropPlan({ ...plan, source: { ...plan.source, width: 2048 } }, scope)).toThrow("CROP_PLAN_SOURCE_MISMATCH");
    expect(() => checkSheetCropPlan({ ...plan, views: [{ ...plan.views[0], crop: { ...plan.views[0].crop, left: 1400 } }] }, scope)).toThrow("CROP_PLAN_OUT_OF_BOUNDS");
  });
  it("rejects duplicate files, invalid roles, oversized labels and excessive records", () => {
    expect(() => checkSheetCropPlan({ ...plan, views: [plan.views[0], plan.views[0]] }, scope)).toThrow("CROP_PLAN_DUPLICATE_VIEW");
    expect(() => checkSheetCropPlan({ ...plan, views: [{ ...plan.views[0], referenceRole: "PRIMARY_IDENTITY" }] }, scope)).toThrow("INVALID_CROP_PLAN");
    expect(() => checkSheetCropPlan({ ...plan, views: [{ ...plan.views[0], label: "x".repeat(81) }] }, scope)).toThrow("INVALID_CROP_PLAN");
    expect(() => checkSheetCropPlan({ ...plan, views: Array.from({ length: 41 }, (_, i) => ({ ...plan.views[0], file: `${i}.png` })) }, scope)).toThrow("INVALID_CROP_PLAN");
  });
});
