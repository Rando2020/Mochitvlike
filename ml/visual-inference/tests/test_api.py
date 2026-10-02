import base64,logging,time
from fastapi.testclient import TestClient
import pytest

from conftest import settings,spec
from visual_inference.app import create_app
from visual_inference.backend import DeterministicTestBackend,GeneratedImage
from visual_inference.errors import bounded_error
from visual_inference.models import GenerateRequest
from visual_inference.registry import MODEL_REGISTRY
from visual_inference.service import VisualInferenceService

def client(**overrides):
    s=settings(**overrides);svc=VisualInferenceService(s);return TestClient(create_app(s,svc)),svc

def payload(**overrides):
    return {"spec":spec(**overrides),"prompt":"canonical prompt"}

def test_healthz_live():
    c,_=client();assert c.get("/healthz").json()=={"ok":True}

def test_readyz_before_load():
    c,_=client();r=c.get("/readyz");assert r.status_code==503 and r.json()["code"]=="SERVICE_NOT_READY"

def test_missing_auth_rejected():
    c,_=client();assert c.post("/v1/production-frame",json=payload()).status_code==401

def test_invalid_auth_rejected():
    c,_=client();assert c.post("/v1/production-frame",headers={"Authorization":"Bearer wrong"},json=payload()).status_code==401

def test_valid_auth(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload());assert r.status_code==200

def test_readyz_after_generation(auth_headers):
    c,_=client();c.post("/v1/production-frame",headers=auth_headers,json=payload());assert c.get("/readyz").status_code==200

def test_strict_top_level_schema(auth_headers):
    c,_=client();body=payload();body["shell"]="rm -rf /";assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_strict_spec_schema(auth_headers):
    c,_=client();body=payload();body["spec"]["repository"]="evil/repo";assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_arbitrary_adapter_input_impossible(auth_headers):
    c,_=client();body=payload();body["spec"]["adapterId"]="evil";assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_arbitrary_filesystem_input_impossible(auth_headers):
    c,_=client();body=payload();body["spec"]["model"]["path"]="/tmp/x";assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_unsupported_dimensions(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload(output={"width":257}));assert r.status_code==400

def test_oversized_content_length(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers={**auth_headers,"content-length":"1000001"},json=payload());assert r.status_code==400

def test_png_response(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload());body=r.json();assert body["mimeType"]=="image/png" and base64.b64decode(body["imageBase64"]).startswith(b"\x89PNG")

def test_requested_dimensions_returned(auth_headers):
    c,_=client();body=c.post("/v1/production-frame",headers=auth_headers,json=payload(output={"width":320,"height":264,"aspectRatio":"40:33"})).json();assert (body["width"],body["height"])==(320,264)

def test_task_id_returned(auth_headers):
    c,_=client();assert c.post("/v1/production-frame",headers=auth_headers,json=payload()).json()["taskId"]

def test_model_revision_mismatch_maps_bounded(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload(model={"revision":"wrong"}));assert r.status_code==409 and r.json()["error"]["code"]=="MODEL_REVISION_MISMATCH"

def test_model_architecture_mismatch_maps_bounded(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload(model={"architecture":"FLUX"}));assert r.status_code==409

def test_unknown_model_maps_bounded(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload(model={"modelId":"evil"}));assert r.json()["error"]["code"]=="MODEL_NOT_SUPPORTED"

def test_candidate_production_request_rejected(auth_headers):
    c,_=client();r=c.post("/v1/production-frame",headers=auth_headers,json=payload(model={"developmentOverride":False}));assert r.status_code==400

def test_prompt_not_logged(auth_headers,caplog):
    caplog.set_level(logging.INFO);c,_=client();c.post("/v1/production-frame",headers=auth_headers,json=payload());assert "canonical prompt" not in caplog.text

def test_auth_token_not_logged(auth_headers,caplog):
    caplog.set_level(logging.INFO);c,_=client();c.post("/v1/production-frame",headers=auth_headers,json=payload());assert "test-secret" not in caplog.text

def test_structured_log_has_model(auth_headers,caplog):
    caplog.set_level(logging.INFO);c,_=client();c.post("/v1/production-frame",headers=auth_headers,json=payload());assert "animagine-xl-4.0" in caplog.text and "durationMs" in caplog.text

def test_reference_count_bounded(auth_headers):
    c,_=client();body=payload();body["spec"]["references"]=[{"id":str(i)} for i in range(19)];assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_no_reference_hosts_fails_closed(auth_headers):
    c,_=client(allowed_reference_hosts=());body=payload();body["spec"]["references"]=[{"id":"x"}];assert c.post("/v1/production-frame",headers=auth_headers,json=body).status_code==400

def test_test_backend_forbidden_in_production():
    with pytest.raises(RuntimeError,match="TEST_BACKEND_FORBIDDEN_IN_PRODUCTION"):VisualInferenceService(settings(environment="production",backend="test"))

def test_missing_token_fails_startup():
    with pytest.raises(RuntimeError,match="VISUAL_INFERENCE_TOKEN_REQUIRED"):VisualInferenceService(settings(auth_token=""))

class SlowBackend(DeterministicTestBackend):
    def generate(self,**kwargs):
        time.sleep(.05);return super().generate(**kwargs)

def test_inference_timeout_mapped(auth_headers):
    s=settings(inference_timeout_seconds=0.001)
    svc=VisualInferenceService(s,backend_factory=lambda m,s:SlowBackend(m,s))
    c=TestClient(create_app(s,svc));r=c.post("/v1/production-frame",headers=auth_headers,json=payload());assert r.status_code==504 and r.json()["error"]["code"]=="INFERENCE_TIMEOUT"

class OomBackend(DeterministicTestBackend):
    def generate(self,**kwargs):raise bounded_error("GPU_OOM")

def test_gpu_oom_sanitized(auth_headers):
    s=settings();svc=VisualInferenceService(s,backend_factory=lambda m,s:OomBackend(m,s));c=TestClient(create_app(s,svc));r=c.post("/v1/production-frame",headers=auth_headers,json=payload());assert r.status_code==503 and r.json()["error"]["code"]=="GPU_OOM"

class BadImageBackend(DeterministicTestBackend):
    def generate(self,**kwargs):return GeneratedImage(b"bad","image/png",kwargs["width"],kwargs["height"],{})

def test_invalid_generated_image_sanitized(auth_headers):
    s=settings();svc=VisualInferenceService(s,backend_factory=lambda m,s:BadImageBackend(m,s));c=TestClient(create_app(s,svc));r=c.post("/v1/production-frame",headers=auth_headers,json=payload());assert r.status_code==502 and r.json()["error"]["code"]=="INVALID_GENERATED_IMAGE"

def test_backend_reused_between_requests(auth_headers):
    s=settings();count={"n":0}
    def factory(m,s):count["n"]+=1;return DeterministicTestBackend(m,s)
    svc=VisualInferenceService(s,backend_factory=factory);c=TestClient(create_app(s,svc));c.post("/v1/production-frame",headers=auth_headers,json=payload());c.post("/v1/production-frame",headers=auth_headers,json=payload());assert count["n"]==1
