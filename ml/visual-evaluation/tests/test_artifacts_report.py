from pathlib import Path
from PIL import Image
from visual_eval.artifacts import ArtifactStore,sha256_bytes
from visual_eval.models import EvaluationMetadata,EvaluationResult,HumanReview
from visual_eval.report import build_report,write_reports
from visual_eval.review import write_review_html

def metadata():
    return EvaluationMetadata(
        model_id="m",model_revision="abc1234",checksum_verified=True,checksum_detail="ok",
        architecture="SDXL",phase="BASE",scenario_id="s",seed=1,prompt_hash="p"*64,
        model_settings={"steps":1},reference_ids=[],lora_ids=[],controlnet=None,
        performance_bible_version=None,ability_id=None,ability_variant_id=None,ability_contract_checksum=None,
        latency_ms=12.5,peak_vram_mb=100.0,output_checksum="o"*64,timestamp="2026-10-01T00:00:00+00:00"
    )

def test_artifact_manifest(tmp_path):
    store=ArtifactStore(tmp_path,"run");p=store.write_manifest({"runId":"run"})
    assert p.exists() and '"runId": "run"' in p.read_text()

def test_image_artifact_and_checksum(tmp_path):
    store=ArtifactStore(tmp_path,"run");path,checksum=store.write_image("m","BASE","s",Image.new("RGB",(8,8),(1,2,3)))
    assert path.exists() and len(checksum)==64 and checksum==sha256_bytes(path.read_bytes())

def test_metadata_artifact(tmp_path):
    store=ArtifactStore(tmp_path,"run");p=store.write_metadata("m","BASE","s",metadata().model_dump())
    assert p.exists() and "abc1234" in p.read_text()

def test_report_no_automatic_winner():
    r=EvaluationResult(status="COMPLETED",metadata=metadata())
    report=build_report([r]);assert report["noAutomaticWinner"] is True

def test_report_latency_capture():
    r=EvaluationResult(status="COMPLETED",metadata=metadata())
    assert build_report([r])["models"]["m"]["meanLatencyMs"]==12.5

def test_report_vram_capture():
    r=EvaluationResult(status="COMPLETED",metadata=metadata())
    assert build_report([r])["models"]["m"]["maxPeakVramMb"]==100.0

def test_partial_report_handles_failed():
    r=EvaluationResult(status="FAILED",error_code="X")
    assert build_report([r])["models"]=={}

def test_write_machine_reports(tmp_path):
    r=EvaluationResult(status="COMPLETED",metadata=metadata())
    a,b=write_reports(tmp_path,[r]);assert a.exists() and b.exists()

def test_human_review_separate_from_metrics():
    r=EvaluationResult(status="COMPLETED",metadata=metadata(),metrics={"x":1},human_review=HumanReview(character_consistency=.8))
    assert r.metrics["x"]==1 and r.human_review.character_consistency==.8

def test_review_html_contains_no_winner_language(tmp_path):
    r=EvaluationResult(status="COMPLETED",metadata=metadata())
    p=write_review_html(tmp_path,[r],{"name":"Burden Draw"})
    text=p.read_text();assert "No automatic winner" in text and "Burden Draw" in text
