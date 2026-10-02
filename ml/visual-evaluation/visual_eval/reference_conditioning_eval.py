from __future__ import annotations

from dataclasses import dataclass

@dataclass(frozen=True)
class ReferenceConditioningReviewDimension:
    id:str
    automated:bool
    notes:str

REFERENCE_CONDITIONING_REVIEW_DIMENSIONS=(
    ReferenceConditioningReviewDimension("identity_preservation",False,"Human/perceptual review remains authoritative."),
    ReferenceConditioningReviewDimension("costume_preservation",False,"Check stable garment attribution."),
    ReferenceConditioningReviewDimension("hair_face_continuity",False,"Check recognizable recurring features."),
    ReferenceConditioningReviewDimension("pose_compliance",True,"Use pose/keypoint evidence only when a pose target exists."),
    ReferenceConditioningReviewDimension("composition_compliance",True,"Compare bounded shot/composition targets."),
    ReferenceConditioningReviewDimension("environment_continuity",False,"Review recurring location continuity."),
    ReferenceConditioningReviewDimension("style_consistency",False,"Review series visual language."),
    ReferenceConditioningReviewDimension("ability_vfx_signature_consistency",False,"Review recurring ability palette/shape/VFX identity."),
    ReferenceConditioningReviewDimension("reference_overfitting_copying",False,"Check excessive copying of reference pose/composition."),
    ReferenceConditioningReviewDimension("artifact_rate",False,"Review anatomy/rendering defects."),
)

REFERENCE_CONDITIONING_EXPERIMENT={
    "id":"orin-primary-identity-v1",
    "series":"The Wounds We Keep",
    "characterId":"char_orin",
    "comparison":{
        "A":"CANONICAL_PROMPT_ONLY",
        "B":"CANONICAL_PROMPT_PLUS_PRIMARY_IDENTITY"
    },
    "fixed":[
        "modelId","modelRevision","adapterRevision","seed","width","height",
        "promptChecksum","scheduler","steps","guidance"
    ],
    "variable":"reference_conditioning",
    "canonicalOutput":"B",
    "developmentOnly":True,
}
