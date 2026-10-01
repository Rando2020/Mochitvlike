from __future__ import annotations
from .base import GenerationOutput,GenerationRequest,UnsupportedPhaseError
from ..adapters.ip_adapter import SDXL_IP_ADAPTER
from ..adapters.controlnet import SDXL_CONTROL

class SDXLPipelineRunner:
    def __init__(self,model_path:str,source_revision:str,device:str="cuda"):
        import torch
        from diffusers import AutoPipelineForText2Image
        self.torch=torch;self.model_path=model_path;self.source_revision=source_revision;self.device=device
        self.pipe=AutoPipelineForText2Image.from_pretrained(model_path,torch_dtype=torch.float16).to(device)
        self.control_pipe=None;self._ip_loaded=False;self._control_ip_loaded=False;self._lora_loaded=False

    def _load_reference(self,pipe,control:bool=False):
        flag="_control_ip_loaded" if control else "_ip_loaded"
        if getattr(self,flag):return
        pipe.load_ip_adapter(SDXL_IP_ADAPTER.repository,subfolder=SDXL_IP_ADAPTER.subfolder,weight_name=SDXL_IP_ADAPTER.weight_name)
        pipe.set_ip_adapter_scale(SDXL_IP_ADAPTER.scale)
        setattr(self,flag,True)

    def _load_lora(self,path:str):
        if self._lora_loaded:return
        self.pipe.load_lora_weights(path,adapter_name="character")
        self.pipe.set_adapters("character",adapter_weights=[1.0]);self._lora_loaded=True

    def _get_control_pipe(self):
        if self.control_pipe is not None:return self.control_pipe
        from diffusers import ControlNetModel,StableDiffusionXLControlNetPipeline
        controlnet=ControlNetModel.from_pretrained(SDXL_CONTROL.repository,torch_dtype=self.torch.float16)
        self.control_pipe=StableDiffusionXLControlNetPipeline.from_pretrained(
            self.model_path,controlnet=controlnet,torch_dtype=self.torch.float16
        ).to(self.device)
        return self.control_pipe

    def generate(self,request:GenerationRequest)->GenerationOutput:
        from PIL import Image
        generator=self.torch.Generator(device=self.device).manual_seed(request.seed)
        common={"prompt":request.prompt,"width":request.width,"height":request.height,"num_inference_steps":request.steps,"guidance_scale":request.guidance,"generator":generator}
        if request.phase=="STRUCTURAL":
            if not request.control_image:raise UnsupportedPhaseError("CONTROL_IMAGE_REQUIRED")
            pipe=self._get_control_pipe();kwargs={**common,"image":Image.open(request.control_image).convert("RGB")}
            if request.reference_image:
                self._load_reference(pipe,control=True);kwargs["ip_adapter_image"]=Image.open(request.reference_image).convert("RGB")
            image=pipe(**kwargs).images[0]
            return GenerationOutput(image,{"mock":False,"architecture":"SDXL","revision":self.source_revision,"controlNet":SDXL_CONTROL.repository,"ipAdapter":self._control_ip_loaded})
        kwargs=dict(common)
        if request.phase in {"REFERENCE","CHARACTER_LORA","ABILITY_CONSISTENCY"}:
            if not request.reference_image:raise UnsupportedPhaseError("REFERENCE_IMAGE_REQUIRED")
            self._load_reference(self.pipe);kwargs["ip_adapter_image"]=Image.open(request.reference_image).convert("RGB")
        if request.phase=="CHARACTER_LORA":
            if not request.lora_path:raise UnsupportedPhaseError("CHARACTER_LORA_REQUIRED")
            self._load_lora(request.lora_path)
        image=self.pipe(**kwargs).images[0]
        return GenerationOutput(image,{"mock":False,"architecture":"SDXL","revision":self.source_revision,"ipAdapter":self._ip_loaded,"lora":self._lora_loaded})
