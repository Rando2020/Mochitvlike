import { describe, expect, it } from "vitest";
import { VISUAL_FOUNDATION_MODELS } from "@/lib/visual-models/registry";
import type { VisualFoundationModel } from "@/lib/visual-models/types";
import { productionFrameModelBlocker } from "../jobs/modelGuard";
import type { ProductionFrameGenerationSpec } from "../types";

const candidate = VISUAL_FOUNDATION_MODELS[0];
const approved = { ...candidate, productionStatus: "APPROVED" } as VisualFoundationModel;
const input = (model: VisualFoundationModel, developmentOverride: boolean, nodeEnv = "production") => ({
  spec: {
    model: {
      modelId: model.id,
      revision: model.source.revision,
      architecture: model.architecture,
      developmentOverride
    }
  } as Pick<ProductionFrameGenerationSpec, "model">,
  frame: { development_visual: developmentOverride },
  job: { model_id: model.id, model_revision: model.source.revision },
  model,
  nodeEnv
});

describe("leased production-frame model guard", () => {
  it("rejects all current candidate models in normal production", () => {
    for (const model of VISUAL_FOUNDATION_MODELS) {
      expect(productionFrameModelBlocker(input(model, false))).toBe("MODEL_NOT_APPROVED");
    }
  });
  it("rejects candidate overrides on hosted Node even if the persisted frame says development", () => {
    expect(productionFrameModelBlocker(input(candidate, true, "production"))).toBe("VISUAL_DEV_MODEL_FORBIDDEN");
    expect(productionFrameModelBlocker(input(candidate, true, undefined))).toBe("VISUAL_DEV_MODEL_FORBIDDEN");
  });
  it("allows an explicitly marked development-only job outside hosted production", () => {
    for (const environment of ["development", "test"]) {
      expect(productionFrameModelBlocker(input(candidate, true, environment))).toBeNull();
    }
  });
  it("rejects replayed jobs whose development marker was altered", () => {
    const state = input(candidate, true, "development");
    expect(productionFrameModelBlocker({ ...state, frame: { development_visual: false } })).toBe("DEVELOPMENT_VISUAL_STATE_MISMATCH");
  });
  it("requires matching model ID, revision and architecture on every worker attempt", () => {
    const state = input(approved, false);
    expect(productionFrameModelBlocker({ ...state, job: { ...state.job, model_id: "different" } })).toBe("MODEL_REVISION_MISMATCH");
    expect(productionFrameModelBlocker({ ...state, job: { ...state.job, model_revision: "stale" } })).toBe("MODEL_REVISION_MISMATCH");
    expect(productionFrameModelBlocker({ ...state, spec: { model: { ...state.spec.model, architecture: "FLUX" } } })).toBe("MODEL_REVISION_MISMATCH");
    expect(productionFrameModelBlocker({ ...state, model: null })).toBe("MODEL_REVISION_MISMATCH");
  });
  it("preserves the normal approved-model execution path", () => {
    expect(productionFrameModelBlocker(input(approved, false))).toBeNull();
  });
});
