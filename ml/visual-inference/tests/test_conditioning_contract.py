from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
def read(path):return (ROOT/path).read_text()

def test_adapter_request_schema_has_no_repo_or_adapter_controls():
    models=read("ml/visual-inference/visual_inference/models.py")
    assert "adapterId" not in models and "adapterRepository" not in models and "adapterPath" not in models

def test_adapter_registry_is_server_side():
    registry=read("ml/visual-inference/visual_inference/adapter_registry.py")
    assert "h94/IP-Adapter" in registry and "9bf28b38530e55ffa91c6d82e5161a982c22f284" in registry

def test_adapter_remains_candidate():
    registry=read("ml/visual-inference/visual_inference/adapter_registry.py")
    assert 'production_status="CANDIDATE"' in registry
    assert 'production_status="APPROVED"' not in registry

def test_base_models_remain_unapproved():
    assert 'productionStatus:"APPROVED"' not in read("lib/visual-models/registry.ts")

def test_no_lora_training():
    combined=read("ml/visual-inference/visual_inference/backend.py")+read("ml/visual-inference/visual_inference/conditioning.py")
    assert "train_lora" not in combined.lower() and "load_lora_weights" not in combined

def test_multi_character_error_is_explicit():
    assert "MULTI_CHARACTER_REFERENCE_CONDITIONING_NOT_SUPPORTED" in read("ml/visual-inference/visual_inference/conditioning.py")

def test_product_worker_remains_durable_owner():
    worker=read("lib/production-frames/jobs/processProductionFrameJob.ts")
    assert "uploadProductionFrame" in worker and "complete_production_frame_generation" in worker

def test_second_quality_gate_retained():
    assert "validateProductionFrameOutput" in read("lib/production-frames/jobs/processProductionFrameJob.ts")

def test_development_marker_retained():
    assert "development_visual" in read("lib/production-frames/jobs/processProductionFrameJob.ts")

def test_modal_config_remains_gpu_bounded():
    modal=read("ml/visual-inference/deploy/modal_app.py")
    assert 'gpu="L40S"' in modal and "max_containers=1" in modal and "max_inputs=1" in modal

def test_reference_security_controls_unchanged():
    refs=read("ml/visual-inference/visual_inference/references.py")
    assert 'parsed.scheme!="https"' in refs and "allowed_reference_hosts" in refs and "REFERENCE_CHECKSUM_MISMATCH" in refs
