from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
SERVICE=ROOT/"ml/visual-inference"

def read(path):return (ROOT/path).read_text()

def test_ts_registry_matches_python_registry_contract():
    ts=read("lib/visual-models/registry.ts")
    for value in [
      "animagine-xl-4.0","2b7c1b397761bf5bd3cc42e5b39ec99314a75a96",
      "illustrious-xl-v2.0","69459c1fe6f46db41ab31e6114f05acc0e06bcaa",
      "flux.1-schnell","cfac132b798278bc25d0d8a8608dc4522b13c615",
    ]:assert value in ts

def test_no_model_auto_approval():
    assert 'productionStatus:"APPROVED"' not in read("lib/visual-models/registry.ts")

def test_dockerfile_pins_requirements():
    d=read("ml/visual-inference/Dockerfile");assert "requirements.lock" in d and "requirements.gpu.lock" in d

def test_docker_healthcheck():
    assert "HEALTHCHECK" in read("ml/visual-inference/Dockerfile")

def test_modal_uses_l40s():
    assert 'gpu="L40S"' in read("ml/visual-inference/deploy/modal_app.py")

def test_modal_scales_to_zero():
    m=read("ml/visual-inference/deploy/modal_app.py");assert "min_containers=0" in m and "scaledown_window=300" in m

def test_modal_bounds_concurrency():
    m=read("ml/visual-inference/deploy/modal_app.py");assert "max_containers=1" in m and "max_inputs=1" in m

def test_modal_has_hard_timeout():
    assert "timeout=180" in read("ml/visual-inference/deploy/modal_app.py")

def test_modal_has_persistent_model_cache():
    m=read("ml/visual-inference/deploy/modal_app.py");assert "modal.Volume.from_name" in m and 'volumes={"/models":cache}' in m

def test_service_never_owns_production_storage():
    combined="".join(p.read_text() for p in (SERVICE/"visual_inference").glob("*.py"))
    assert "production-frames" not in combined and "supabase" not in combined.lower()

def test_next_worker_keeps_second_quality_gate():
    worker=read("lib/production-frames/jobs/processProductionFrameJob.ts")
    assert "validateProductionFrameOutput" in worker and "uploadProductionFrame" in worker

def test_benchmark_boundary_unchanged():
    assert "BENCHMARK_REFERENCE_FORBIDDEN" in read("lib/production-frames/references.ts")

def test_development_marker_unchanged():
    worker=read("lib/production-frames/jobs/processProductionFrameJob.ts")
    assert "development_visual" in worker

def test_provider_boundary_remains_http():
    provider=read("lib/production-frames/provider.ts")
    assert "HttpProductionFrameProvider" in provider and "VISUAL_INFERENCE_URL" in provider

def test_no_lora_training_in_service():
    combined="".join(p.read_text().lower() for p in (SERVICE/"visual_inference").glob("*.py"))
    assert "train_lora" not in combined and "training_loop" not in combined

def test_no_arbitrary_repo_field_in_request_schema():
    models=read("ml/visual-inference/visual_inference/models.py")
    assert "repository:" not in models and "filesystem" not in models

def test_reference_urls_are_not_safe_log_fields():
    logging=read("ml/visual-inference/visual_inference/logging.py")
    assert '"assetUrl"' in logging and '"prompt"' in logging and '"authorization"' in logging and '"provenance"' in logging

def test_env_example_marks_test_backend_development():
    e=read("ml/visual-inference/.env.example");assert "VISUAL_INFERENCE_BACKEND=test" in e and "ENVIRONMENT=development" in e
