from pathlib import Path
from PIL import Image
import pytest
from visual_eval.adapters.ip_adapter import SDXL_IP_ADAPTER,FLUX_IP_ADAPTER
from visual_eval.adapters.controlnet import SDXL_CONTROL,FLUX_CONTROL
from visual_eval.adapters.lora import LoRAInput,validate_lora
from visual_eval.config import MODEL_ADAPTER_SUPPORT,config_for
from visual_eval.pipelines.base import MockPipeline,GenerationRequest

def request(phase="BASE"):
    return GenerationRequest("prompt",7,32,32,1,1.0,phase)

def test_sdxl_ip_adapter_pinned(): assert SDXL_IP_ADAPTER.repository=="h94/IP-Adapter"
def test_flux_ip_adapter_pinned(): assert FLUX_IP_ADAPTER.repository=="XLabs-AI/flux-ip-adapter"
def test_sdxl_controlnet_configured(): assert SDXL_CONTROL.status=="SUPPORTED" and SDXL_CONTROL.repository
def test_flux_structural_honestly_unverified(): assert "UNVERIFIED" in FLUX_CONTROL.status
def test_sdxl_adapter_support(): assert MODEL_ADAPTER_SUPPORT["animagine-xl-4.0"].ip_adapter=="SUPPORTED"
def test_flux_reference_is_experimental(): assert MODEL_ADAPTER_SUPPORT["flux.1-schnell"].ip_adapter=="EXPERIMENTAL"
def test_flux_structural_is_unverified(): assert MODEL_ADAPTER_SUPPORT["flux.1-schnell"].controlnet=="UNVERIFIED"
def test_flux_uses_different_inference_steps(): assert config_for("flux.1-schnell").steps!=config_for("animagine-xl-4.0").steps
def test_lora_validation(): assert validate_lora(LoRAInput("adapter")).adapter_name=="character"
def test_bad_lora_weight_rejected():
    with pytest.raises(ValueError):validate_lora(LoRAInput("adapter",weight=0))
def test_mock_pipeline_is_deterministic():
    p=MockPipeline("SDXL","m");a=p.generate(request()).image;b=p.generate(request()).image
    assert list(a.getdata())==list(b.getdata())
def test_mock_pipeline_records_phase():
    out=MockPipeline("FLUX","m").generate(request("REFERENCE"))
    assert out.provider_metadata["phase"]=="REFERENCE"
