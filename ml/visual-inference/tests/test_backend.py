import pytest
from conftest import settings
from visual_inference.backend import DeterministicTestBackend,DiffusersSDXLBackend,GeneratedImage,create_backend
from visual_inference.errors import InferenceError
from visual_inference.registry import MODEL_REGISTRY

MODEL=MODEL_REGISTRY["animagine-xl-4.0"]

def test_test_backend_loads():
    b=DeterministicTestBackend(MODEL,settings());b.load();assert b.loaded

def test_test_backend_forbidden_in_production():
    b=DeterministicTestBackend(MODEL,settings(environment="production"))
    with pytest.raises(RuntimeError,match="TEST_BACKEND_FORBIDDEN_IN_PRODUCTION"):b.load()

def test_test_backend_deterministic():
    b=DeterministicTestBackend(MODEL,settings());a=b.generate(prompt="x",width=256,height=256,seed=7,references=[],development_override=True);c=b.generate(prompt="x",width=256,height=256,seed=7,references=[],development_override=True);assert a.bytes==c.bytes

def test_seed_changes_output():
    b=DeterministicTestBackend(MODEL,settings());a=b.generate(prompt="x",width=256,height=256,seed=7,references=[],development_override=True);c=b.generate(prompt="x",width=256,height=256,seed=8,references=[],development_override=True);assert a.bytes!=c.bytes

def test_prompt_changes_output():
    b=DeterministicTestBackend(MODEL,settings());a=b.generate(prompt="x",width=256,height=256,seed=7,references=[],development_override=True);c=b.generate(prompt="y",width=256,height=256,seed=7,references=[],development_override=True);assert a.bytes!=c.bytes

def test_dimensions_forwarded():
    b=DeterministicTestBackend(MODEL,settings());x=b.generate(prompt="x",width=320,height=264,seed=1,references=[],development_override=True);assert (x.width,x.height)==(320,264)

def test_png_returned():
    b=DeterministicTestBackend(MODEL,settings());x=b.generate(prompt="x",width=256,height=256,seed=1,references=[],development_override=True);assert x.mime_type=="image/png" and x.bytes.startswith(b"\x89PNG")

def test_backend_factory_uses_test_only_when_requested():
    assert isinstance(create_backend(MODEL,settings(backend="test")),DeterministicTestBackend)

def test_diffusers_production_references_fail_without_adapter():
    class Loaded(DiffusersSDXLBackend):
        def load(self):self.loaded=True
    b=Loaded(MODEL,settings(backend="diffusers"));b.loaded=True
    with pytest.raises(InferenceError,match="REFERENCE_CONDITIONING_NOT_SUPPORTED"):
        b.generate(prompt="x",width=256,height=256,seed=1,references=[object()],development_override=False)

def test_model_cache_object_is_reusable():
    b=DeterministicTestBackend(MODEL,settings());b.load();before=id(b);b.load();assert id(b)==before and b.loaded
