from pathlib import Path
from visual_eval.reference_assets import create_reference_manifest,mock_reference_generator
from visual_eval.approval import recommend_production_review

REFS=[{"slot":"ACTIVATION_POSE","assetKey":"a","required":True},{"slot":"VFX_ISOLATION","assetKey":"b","required":True}]

def test_synthetic_reference_manifest(tmp_path):
    rows=create_reference_manifest(REFS,tmp_path,mock_reference_generator)
    assert len(rows)==2 and all(x.source=="SYNTHETIC" for x in rows)

def test_reference_assets_benchmark_only(tmp_path):
    rows=create_reference_manifest(REFS,tmp_path,mock_reference_generator)
    assert all(x.benchmark_only is True for x in rows)

def test_reference_assets_not_creator_approved(tmp_path):
    rows=create_reference_manifest(REFS,tmp_path,mock_reference_generator)
    assert all(x.creator_approved is False for x in rows)

def test_reference_asset_checksums(tmp_path):
    rows=create_reference_manifest(REFS,tmp_path,mock_reference_generator)
    assert all(len(x.checksum)==64 for x in rows)

def test_reference_generation_is_deterministic(tmp_path):
    a=create_reference_manifest(REFS,tmp_path/"a",mock_reference_generator)
    b=create_reference_manifest(REFS,tmp_path/"b",mock_reference_generator)
    assert [x.checksum for x in a]==[x.checksum for x in b]

def test_incomplete_evidence_continues_evaluation():
    r=recommend_production_review(model_id="m",benchmark_complete=False,character_evidence_complete=False,ability_evidence_complete=False,checksum_verified=True,license_ready=True,adapter_compatibility="SUPPORTED",critical_failures=[])
    assert r.recommendation=="CONTINUE_EVALUATION"

def test_missing_checksum_blocks_eligibility():
    r=recommend_production_review(model_id="m",benchmark_complete=True,character_evidence_complete=True,ability_evidence_complete=True,checksum_verified=False,license_ready=True,adapter_compatibility="SUPPORTED",critical_failures=[])
    assert r.recommendation=="CONTINUE_EVALUATION"

def test_license_review_blocks_eligibility():
    r=recommend_production_review(model_id="m",benchmark_complete=True,character_evidence_complete=True,ability_evidence_complete=True,checksum_verified=True,license_ready=False,adapter_compatibility="SUPPORTED",critical_failures=[])
    assert r.recommendation=="CONTINUE_EVALUATION"

def test_complete_evidence_only_recommends_human_review():
    r=recommend_production_review(model_id="m",benchmark_complete=True,character_evidence_complete=True,ability_evidence_complete=True,checksum_verified=True,license_ready=True,adapter_compatibility="SUPPORTED",critical_failures=[])
    assert r.recommendation=="ELIGIBLE_FOR_PRODUCTION_REVIEW"

def test_critical_failure_rejects():
    r=recommend_production_review(model_id="m",benchmark_complete=True,character_evidence_complete=True,ability_evidence_complete=True,checksum_verified=True,license_ready=True,adapter_compatibility="SUPPORTED",critical_failures=["identity collapse"])
    assert r.recommendation=="REJECT"
