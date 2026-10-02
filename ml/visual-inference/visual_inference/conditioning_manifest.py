from __future__ import annotations

REFERENCE_CONDITIONING_EVALUATION_MANIFEST={
    "version":"1.0",
    "series":"The Wounds We Keep",
    "character":"Orin",
    "ability":"Burden Draw",
    "comparison":{
        "A":"canonical_prompt_only",
        "B":"canonical_prompt_plus_primary_identity"
    },
    "fixed":["model_revision","seed","dimensions","prompt","scheduler","steps","guidance"],
    "review_dimensions":[
        "identity_preservation","costume_preservation","hair_face_continuity",
        "pose_compliance","composition_compliance","environment_continuity",
        "style_consistency","ability_vfx_signature_consistency",
        "reference_overfitting_copying","artifact_rate"
    ],
}
