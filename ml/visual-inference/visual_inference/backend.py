from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
import os
from typing import Sequence

from PIL import Image, ImageDraw

from .errors import bounded_error
from .models import RuntimeReference
from .registry import ModelEntry
from .settings import Settings

@dataclass
class GeneratedImage:
    bytes: bytes
    mime_type: str
    width: int
    height: int
    metadata: dict[str,object]

class VisualInferenceBackend(ABC):
    def __init__(self, model:ModelEntry, settings:Settings):
        self.model=model
        self.settings=settings
        self.loaded=False

    @abstractmethod
    def load(self)->None: ...

    @abstractmethod
    def generate(self,*,prompt:str,width:int,height:int,seed:int,references:Sequence[RuntimeReference],development_override:bool)->GeneratedImage: ...

class DeterministicTestBackend(VisualInferenceBackend):
    def load(self)->None:
        if self.settings.environment=="production":
            raise RuntimeError("TEST_BACKEND_FORBIDDEN_IN_PRODUCTION")
        self.loaded=True

    def generate(self,*,prompt:str,width:int,height:int,seed:int,references:Sequence[RuntimeReference],development_override:bool)->GeneratedImage:
        if not self.loaded:self.load()
        digest=sha256(f"{self.model.model_id}|{self.model.revision}|{seed}|{prompt}".encode()).digest()
        image=Image.new("RGB",(width,height),(digest[0],digest[1],digest[2]))
        draw=ImageDraw.Draw(image);draw.rectangle((0,0,min(width-1,15),min(height-1,15)),fill=(digest[3],digest[4],digest[5]))
        buffer=BytesIO();image.save(buffer,format="PNG")
        return GeneratedImage(buffer.getvalue(),"image/png",width,height,{"backend":"test","conditioning":"TEST_ONLY"})

class DiffusersSDXLBackend(VisualInferenceBackend):
    def __init__(self,model:ModelEntry,settings:Settings):
        super().__init__(model,settings);self.pipeline=None

    def load(self)->None:
        if self.loaded:return
        try:
            import torch
            from diffusers import StableDiffusionXLPipeline
            self.pipeline=StableDiffusionXLPipeline.from_pretrained(
                self.model.repository,
                revision=self.model.revision,
                torch_dtype=torch.float16,
                use_safetensors=True,
                cache_dir=self.settings.model_cache_dir,
            )
            self.pipeline.to("cuda")
            self.pipeline.set_progress_bar_config(disable=True)
            self.loaded=True
        except Exception as exc:
            raise bounded_error("MODEL_LOAD_FAILED") from exc

    def generate(self,*,prompt:str,width:int,height:int,seed:int,references:Sequence[RuntimeReference],development_override:bool)->GeneratedImage:
        if references and not development_override:
            raise bounded_error("REFERENCE_CONDITIONING_NOT_SUPPORTED")
        if not self.loaded:self.load()
        try:
            import torch
            generator=torch.Generator(device="cuda").manual_seed(seed)
            result=self.pipeline(
                prompt=prompt,
                width=width,
                height=height,
                generator=generator,
                num_inference_steps=int(os.getenv("SDXL_INFERENCE_STEPS","28")),
                guidance_scale=float(os.getenv("SDXL_GUIDANCE_SCALE","6.5")),
            )
            image=result.images[0]
            buffer=BytesIO();image.save(buffer,format="PNG")
            return GeneratedImage(buffer.getvalue(),"image/png",image.width,image.height,{
                "backend":"diffusers-sdxl",
                "conditioning":"PROMPT_ONLY_DEVELOPMENT" if references else "PROMPT_ONLY",
                "steps":int(os.getenv("SDXL_INFERENCE_STEPS","28")),
                "guidance":float(os.getenv("SDXL_GUIDANCE_SCALE","6.5")),
            })
        except RuntimeError as exc:
            if "out of memory" in str(exc).lower():
                raise bounded_error("GPU_OOM") from None
            raise bounded_error("INTERNAL_TRANSIENT") from None
        except Exception:
            raise bounded_error("INTERNAL_TRANSIENT") from None

def create_backend(model:ModelEntry,settings:Settings)->VisualInferenceBackend:
    if settings.backend=="test":
        return DeterministicTestBackend(model,settings)
    if model.backend=="SDXL_DIFFUSERS":
        return DiffusersSDXLBackend(model,settings)
    raise bounded_error("MODEL_NOT_SUPPORTED")
