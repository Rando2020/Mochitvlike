import hashlib
import json
from pathlib import Path
import pytest
from visual_eval.registry import load_bundle,model_records,get_model,verify_artifact_checksum,ModelRecord

BUNDLE=Path(__file__).parents[1]/"contracts"/"benchmark.v1.json"

def test_package_bundle_loads(): assert load_bundle(BUNDLE)["schemaVersion"]=="visual-benchmark-bundle-v1"
def test_three_models_exported(): assert len(model_records(load_bundle(BUNDLE)))==3
def test_exact_revisions_not_main(): assert all(m.revision and m.revision!="main" for m in model_records(load_bundle(BUNDLE)))
def test_animagine_revision_pinned(): assert get_model(load_bundle(BUNDLE),"animagine-xl-4.0").revision=="2b7c1b397761bf5bd3cc42e5b39ec99314a75a96"
def test_illustrious_revision_pinned(): assert get_model(load_bundle(BUNDLE),"illustrious-xl-v2.0").revision=="69459c1fe6f46db41ab31e6114f05acc0e06bcaa"
def test_flux_revision_pinned(): assert get_model(load_bundle(BUNDLE),"flux.1-schnell").revision=="cfac132b798278bc25d0d8a8608dc4522b13c615"
def test_unknown_model_rejected():
    with pytest.raises(ValueError,match="MODEL_NOT_FOUND"): get_model(load_bundle(BUNDLE),"missing")
def test_missing_checksum_is_explicit(tmp_path):
    model=get_model(load_bundle(BUNDLE),"flux.1-schnell")
    assert verify_artifact_checksum(model,tmp_path)==(False,"CHECKSUM_NOT_AVAILABLE")
def test_checksum_target_missing_is_explicit(tmp_path):
    model=get_model(load_bundle(BUNDLE),"animagine-xl-4.0")
    assert verify_artifact_checksum(model,tmp_path)==(False,"CHECKSUM_TARGET_MISSING")
def test_checksum_success(tmp_path):
    p=tmp_path/"weights.bin";p.write_bytes(b"abc");digest=hashlib.sha256(b"abc").hexdigest()
    model=ModelRecord("m","M","r","abc1234",digest,"weights.bin","SDXL",True,"CANDIDATE")
    assert verify_artifact_checksum(model,tmp_path)==(True,digest)
def test_checksum_mismatch(tmp_path):
    p=tmp_path/"weights.bin";p.write_bytes(b"abc")
    model=ModelRecord("m","M","r","abc1234","0"*64,"weights.bin","SDXL",True,"CANDIDATE")
    ok,actual=verify_artifact_checksum(model,tmp_path);assert ok is False and actual!="0"*64
def test_bad_schema_rejected(tmp_path):
    p=tmp_path/"x.json";p.write_text(json.dumps({"schemaVersion":"bad"}))
    with pytest.raises(ValueError,match="UNSUPPORTED_BUNDLE_SCHEMA"): load_bundle(p)
