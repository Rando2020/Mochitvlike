from pathlib import Path
from types import SimpleNamespace
from PIL import Image
import pytest
import visual_eval.runner as runner
from visual_eval.runner import execute_one

BUNDLE=Path(__file__).parents[1]/"contracts"/"benchmark.v1.json"

def args(tmp_path,**overrides):
    base=dict(
        bundle=str(BUNDLE),model="animagine-xl-4.0",phase="BASE",scenario="char-closeup",
        artifacts_dir=str(tmp_path),run_id="run",reference_image=None,control_image=None,lora_path=None,
        external_cost_usd=None,mock=True,dry_run=False,smoke=False
    )
    base.update(overrides);return SimpleNamespace(**base)

def test_mock_base_run_completes(tmp_path):
    result,root=execute_one(args(tmp_path))
    assert result.status=="COMPLETED" and (root/"visual-evaluation-results.json").exists()

def test_mock_result_has_prompt_hash(tmp_path):
    result,_=execute_one(args(tmp_path))
    assert result.metadata and len(result.metadata.prompt_hash)==64

def test_mock_result_has_output_checksum(tmp_path):
    result,_=execute_one(args(tmp_path))
    assert result.metadata and len(result.metadata.output_checksum)==64

def test_mock_records_latency(tmp_path):
    result,_=execute_one(args(tmp_path))
    assert result.metadata and result.metadata.latency_ms>=0

def test_reference_phase_requires_asset(tmp_path):
    result,_=execute_one(args(tmp_path,phase="REFERENCE"))
    assert result.status=="SKIPPED" and result.error_code=="REFERENCE_IMAGE_REQUIRED"

def test_structural_phase_requires_reference_first(tmp_path):
    result,_=execute_one(args(tmp_path,phase="STRUCTURAL"))
    assert result.status=="SKIPPED" and result.error_code=="REFERENCE_IMAGE_REQUIRED"

def test_character_lora_requires_reference(tmp_path):
    result,_=execute_one(args(tmp_path,phase="CHARACTER_LORA"))
    assert result.status=="SKIPPED" and result.error_code=="REFERENCE_IMAGE_REQUIRED"

def test_ability_phase_requires_reference(tmp_path):
    scenario="ability_consistency_266b34d"
    result,_=execute_one(args(tmp_path,phase="ABILITY_CONSISTENCY",scenario=scenario))
    assert result.status=="SKIPPED" and result.error_code=="REFERENCE_IMAGE_REQUIRED"

def test_ability_mock_records_bible_and_variant(tmp_path):
    ref=tmp_path/"ref.png";Image.new("RGB",(16,16),(10,20,30)).save(ref)
    result,_=execute_one(args(tmp_path,phase="ABILITY_CONSISTENCY",scenario="ability_consistency_266b34d",reference_image=str(ref)))
    assert result.status=="COMPLETED" and result.metadata.performance_bible_version==1
    assert result.metadata.ability_variant_id=="variant_08b360577b78611cab4f"

def test_ability_result_contains_palette_evidence(tmp_path):
    ref=tmp_path/"ref.png";Image.new("RGB",(16,16),(10,20,30)).save(ref)
    result,_=execute_one(args(tmp_path,phase="ABILITY_CONSISTENCY",scenario="ability_consistency_266b34d",reference_image=str(ref)))
    assert "abilityPaletteSimilarity" in result.metrics

def test_dry_run_executes_zero_inference(tmp_path,monkeypatch):
    monkeypatch.setattr(runner,"_pipeline",lambda *a,**k: (_ for _ in ()).throw(AssertionError("pipeline should not load")))
    result,_=execute_one(args(tmp_path,dry_run=True))
    assert result.status=="SKIPPED" and result.error_code=="DRY_RUN"

def test_failed_inference_is_isolated(tmp_path,monkeypatch):
    class Boom:
        def generate(self,_): raise RuntimeError("secret provider detail")
    monkeypatch.setattr(runner,"_pipeline",lambda *a,**k:Boom())
    result,_=execute_one(args(tmp_path))
    assert result.status=="FAILED" and result.error_code=="RuntimeError"
    assert "secret provider detail" not in (result.error_message or "")

def test_smoke_mode_records_reduced_settings(tmp_path):
    result,_=execute_one(args(tmp_path,smoke=True))
    assert result.metadata and result.metadata.model_settings["smokeMode"] is True
    assert result.metadata.model_settings["width"]==512 and result.metadata.model_settings["steps"]<=8
