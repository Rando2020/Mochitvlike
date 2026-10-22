import type { VisualFoundationModel } from "@/lib/visual-models/types";
import type { ProductionFrameGenerationSpec } from "../types";

type StoredModelState = {
  development_visual: boolean;
};
type StoredJobModel = {
  model_id: string;
  model_revision: string;
};

/**
 * Verify all approval/scope invariants again when a leased job is claimed.
 * A queued spec is historical evidence, not permission to run a candidate
 * model in production or to silently switch its pinned model revision.
 */
export function productionFrameModelBlocker(input: {
  spec: Pick<ProductionFrameGenerationSpec, "model">;
  frame: StoredModelState;
  job: StoredJobModel;
  model: VisualFoundationModel | null;
  nodeEnv: string | undefined;
}): string | null {
  const { spec, frame, job, model, nodeEnv } = input;
  if (!model ||
      spec.model.modelId !== job.model_id ||
      spec.model.modelId !== model.id ||
      spec.model.revision !== job.model_revision ||
      spec.model.revision !== model.source.revision ||
      spec.model.architecture !== model.architecture) {
    return "MODEL_REVISION_MISMATCH";
  }
  if (spec.model.developmentOverride !== frame.development_visual) {
    return "DEVELOPMENT_VISUAL_STATE_MISMATCH";
  }
  if (spec.model.developmentOverride) {
    // NODE_ENV is "production" on hosted Next.js deployments, including previews.
    // Candidate evaluations must run through an explicitly isolated development
    // worker, never by replaying development-marked jobs on hosted production.
    return nodeEnv === "development" || nodeEnv === "test"
      ? null
      : "VISUAL_DEV_MODEL_FORBIDDEN";
  }
  return model.productionStatus === "APPROVED" ? null : "MODEL_NOT_APPROVED";
}
