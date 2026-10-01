from __future__ import annotations
from .base import GenerationOutput,GenerationRequest,UnsupportedPhaseError
from ..adapters.ip_adapter import FLUX_IP_ADAPTER

class FluxPipelineRunner:
    def __init__(self,model_path:str,source_revision:str,device:str="cuda"):
        import torch
        from diffusers import FluxPipeline
        self.torch=torch;self.model_path=model_path;self.source_revision=source_revision;self.device=device
        self.pipe=FluxPipeline.from_pretrained(model_path,torch_dtype=torch.bfloat16)
        self.pipe.enable_model_cpu_offload()
        self._ip_loaded=False;self._lora_loaded=False

    def _load_reference(self):
        if self._ip_loaded:return
        self.pipe.load_ip_adapter(
            FLUX_IP_ADAPTER.repository,weight_name=FLUX_IP_ADAPTER.weight_name,
            image_encoder_pretrained_model_name_or_path=FLUX_IP_ADAPTER.image_encoder
        )
        self.pipe.set_ip_adapter_scale(FLUX_IP_ADAPTER.scale);self._ip_loaded=True

    def _load_lora(self,path:str):
        if self._lora_loaded:return
        self.pipe.load_lora_weights(path,adapter_name="character")
        self.pipe.set_adapters("character",adapter_weights=[1.0]);self._lora_loaded=True

    def generate(self,request:GenerationRequest)->GenerationOutput:
        from PIL import Image
        if request.phase=="STRUCTURAL":
            raise UnsupportedPhaseError("FLUX_SCHNELL_STRUCTURAL_CONTROL_UNVERIFIED")
        kwargs={"prompt":request.prompt,"width":request.width,"height":request.height,"num_inference_steps":request.steps,"guidance_scale":request.guidance,"generator":self.torch.Generator(device="cpu").manual_seed(request.seed)}
        if request.phase in {"REFERENCE","CHARACTER_LORA","ABILITY_CONSISTENCY"}:
            if not request.reference_image:raise UnsupportedPhaseError("REFERENCE_IMAGE_REQUIRED")
            self._load_reference();kwargs["ip_adapter_image"]=Image.open(request.reference_image).convert("RGB")
        if request.phase=="CHARACTER_LORA":
            if not request.lora_path:raise UnsupportedPhaseError("CHARACTER_LORA_REQUIRED")
            self._load_lora(request.lora_path)
        image=self.pipe(**kwargs).images[0]
        return GenerationOutput(image,{"mock":False,"architecture":"FLUX","revision":self.source_revision,"ipAdapter":self._ip_loaded,"lora":self._lora_loaded})
