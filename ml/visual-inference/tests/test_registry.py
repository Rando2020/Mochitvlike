import pytest
from visual_inference.errors import InferenceError
from visual_inference.registry import MODEL_REGISTRY,resolve_model
from visual_inference.settings import Settings

def test_registry_has_current_models():
    assert set(MODEL_REGISTRY)=={"animagine-xl-4.0","illustrious-xl-v2.0","flux.1-schnell"}

@pytest.mark.parametrize("model_id,revision",[
 ("animagine-xl-4.0","2b7c1b397761bf5bd3cc42e5b39ec99314a75a96"),
 ("illustrious-xl-v2.0","69459c1fe6f46db41ab31e6114f05acc0e06bcaa"),
 ("flux.1-schnell","cfac132b798278bc25d0d8a8608dc4522b13c615"),
])
def test_pinned_revision(model_id,revision): assert MODEL_REGISTRY[model_id].revision==revision

def test_exact_revision_accepted():
    m=resolve_model("animagine-xl-4.0",MODEL_REGISTRY["animagine-xl-4.0"].revision,"SDXL",True,"animagine-xl-4.0")
    assert m.repository=="cagliostrolab/animagine-xl-4.0"

def test_unknown_model_rejected():
    with pytest.raises(InferenceError,match="MODEL_NOT_SUPPORTED"):resolve_model("unknown","x","SDXL",True,None)

def test_unknown_revision_rejected():
    with pytest.raises(InferenceError,match="MODEL_REVISION_MISMATCH"):resolve_model("animagine-xl-4.0","wrong","SDXL",True,None)

def test_architecture_mismatch_rejected():
    with pytest.raises(InferenceError,match="MODEL_REVISION_MISMATCH"):resolve_model("animagine-xl-4.0",MODEL_REGISTRY["animagine-xl-4.0"].revision,"FLUX",True,None)

def test_flux_v1_fails_instead_of_substitution():
    m=MODEL_REGISTRY["flux.1-schnell"]
    with pytest.raises(InferenceError,match="MODEL_NOT_SUPPORTED"):resolve_model(m.model_id,m.revision,m.architecture,True,None)

def test_dev_model_restriction():
    m=MODEL_REGISTRY["illustrious-xl-v2.0"]
    with pytest.raises(InferenceError,match="MODEL_NOT_SUPPORTED"):resolve_model(m.model_id,m.revision,m.architecture,True,"animagine-xl-4.0")

def test_candidate_not_accepted_as_production():
    m=MODEL_REGISTRY["animagine-xl-4.0"]
    with pytest.raises(InferenceError,match="MODEL_NOT_SUPPORTED"):resolve_model(m.model_id,m.revision,m.architecture,False,None)

def test_registry_has_no_client_repository_input():
    assert all(entry.repository for entry in MODEL_REGISTRY.values())
