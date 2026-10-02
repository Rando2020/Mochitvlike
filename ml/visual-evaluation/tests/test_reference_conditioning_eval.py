from visual_eval.reference_conditioning_eval import REFERENCE_CONDITIONING_EXPERIMENT,REFERENCE_CONDITIONING_REVIEW_DIMENSIONS

def test_conditioning_experiment_is_development_only():
    assert REFERENCE_CONDITIONING_EXPERIMENT["developmentOnly"] is True

def test_conditioning_experiment_only_varies_reference_conditioning():
    assert REFERENCE_CONDITIONING_EXPERIMENT["variable"]=="reference_conditioning"

def test_conditioned_result_is_canonical_candidate():
    assert REFERENCE_CONDITIONING_EXPERIMENT["canonicalOutput"]=="B"

def test_same_model_revision_is_fixed():
    assert "modelRevision" in REFERENCE_CONDITIONING_EXPERIMENT["fixed"]

def test_same_adapter_revision_is_fixed():
    assert "adapterRevision" in REFERENCE_CONDITIONING_EXPERIMENT["fixed"]

def test_same_seed_is_fixed():
    assert "seed" in REFERENCE_CONDITIONING_EXPERIMENT["fixed"]

def test_identity_review_is_not_faked_as_automated():
    dim=next(x for x in REFERENCE_CONDITIONING_REVIEW_DIMENSIONS if x.id=="identity_preservation")
    assert dim.automated is False

def test_ability_consistency_is_human_review():
    dim=next(x for x in REFERENCE_CONDITIONING_REVIEW_DIMENSIONS if x.id=="ability_vfx_signature_consistency")
    assert dim.automated is False

def test_pose_metric_only_claims_bounded_automation():
    dim=next(x for x in REFERENCE_CONDITIONING_REVIEW_DIMENSIONS if x.id=="pose_compliance")
    assert dim.automated is True
