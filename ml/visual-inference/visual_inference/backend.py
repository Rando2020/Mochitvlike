from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
import os
from typing import Sequence

from PIL import Image, ImageDraw

from .adapter_registry import resolve_reference_conditioning_adapter
from .conditioning import PreparedConditioning,ReferenceConditioningAdapter
from .errors import bounded_error
from .models import ProductionFrameSpec,RuntimeReference
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
    def __init__(self,model:ModelEntry,settings:Settings):
        self.model=model
        self.settings=settings
        self.loaded=False

    @abstractmethod
    def load(self)->None: ...

    @abstractmethod
    def generate(
        self,*,
        prompt:str,width:int,height:int,seed:int,
        references:Sequence[RuntimeReference],
        development_override:bool,
        spec:ProductionFrameSpec|None=None,
    )->GeneratedImage: ...

def _adapter_for(model:ModelEntry,settings:Settings,development_override:bool)->ReferenceConditioningAdapter:
    entry=resolve_reference_conditioning_adapter(
        settings.reference_conditioning_adapter_id,
        model.architecture,
        development_override,
        settings.reference_conditioning_adapter_revision,
    )
    return ReferenceConditioningAdapter(
        entry,
        identity_scale=settings.identity_conditioning_scale,
        vfx_scale=settings.vfx_conditioning_scale,
        color_scale=settings.color_conditioning_scale,
        max_references=settings.max_conditioning_references,
    )

class DeterministicTestBackend(VisualInferenceBackend):
    def __init__(self,model:ModelEntry,settings:Settings):
        super().__init__(model,settings);self.adapter:ReferenceConditioningAdapter|None=None

    def load(self)->None:
        if self.settings.environment=="production":
            raise RuntimeError("TEST_BACKEND_FORBIDDEN_IN_PRODUCTION")
        self.loaded=True

    def generate(self,*,prompt:str,width:int,height:int,seed:int,references:Sequence[RuntimeReference],development_override:bool,spec:ProductionFrameSpec|None=None)->GeneratedImage:
        if not self.loaded:self.load()
        conditioning:PreparedConditioning|None=None
        if references:
            if spec is None:raise bounded_error("REFERENCE_CONDITIONING_FAILED")
            if self.adapter is None:
                self.adapter=_adapter_for(self.model,self.settings,development_override)
            conditioning=self.adapter.prepare(references,spec)
        ref_key="|".join(
            f"{r.reference_id}:{r.checksum}:{r.role}:{r.scale:.3f}"
            for r in (conditioning.references if conditioning else ())
        )
        digest=sha256(f"{self.model.model_id}|{self.model.revision}|{seed}|{prompt}|{ref_key}".encode()).digest()
        image=Image.new("RGB",(width,height),(digest[0],digest[1],digest[2]))
        draw=ImageDraw.Draw(image);draw.rectangle((0,0,min(width-1,15),min(height-1,15)),fill=(digest[3],digest[4],digest[5]))
        buffer=BytesIO();image.save(buffer,format="PNG")
        return GeneratedImage(buffer.getvalue(),"image/png",width,height,{
            "backend":"test",
            "conditioning":"TEST_REFERENCE_CONDITIONING" if conditioning and conditioning.references else "TEST_ONLY",
            "adapterId":conditioning.adapter_id if conditioning else None,
            "adapterRevision":conditioning.adapter_revision if conditioning else None,
            "conditioningReferenceIds":list(conditioning.reference_ids) if conditioning else [],
        })

class DiffusersSDXLBackend(VisualInferenceBackend):
    def __init__(self,model:ModelEntry,settings:Settings):
        super().__init__(model,settings)
        self.pipeline=None
        self.adapter:ReferenceConditioningAdapter|None=None

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

    def _conditioning(self,references:Sequence[RuntimeReference],spec:ProductionFrameSpec|None,development_override:bool)->PreparedConditioning|None:
        if not references:return None
        if spec is None:raise bounded_error("REFERENCE_CONDITIONING_FAILED")
        entry=resolve_reference_conditioning_adapter(
            self.settings.reference_conditioning_adapter_id,
            self.model.architecture,
            development_override,
            self.settings.reference_conditioning_adapter_revision,
        )
        if self.adapter is None or self.adapter.entry.id!=entry.id or self.adapter.entry.revision!=entry.revision:
            self.adapter=ReferenceConditioningAdapter(
                entry,
                identity_scale=self.settings.identity_conditioning_scale,
                vfx_scale=self.settings.vfx_conditioning_scale,
                color_scale=self.settings.color_conditioning_scale,
                max_references=self.settings.max_conditioning_references,
            )
        return self.adapter.prepare(references,spec)

    def generate(self,*,prompt:str,width:int,height:int,seed:int,references:Sequence[RuntimeReference],development_override:bool,spec:ProductionFrameSpec|None=None)->GeneratedImage:
        if not self.loaded:self.load()
        conditioning=self._conditioning(references,spec,development_override)
        adapter_kwargs={}
        try:
            import torch
            if conditioning and conditioning.references:
                adapter_kwargs=self.adapter.apply(self.pipeline,conditioning)
            generator=torch.Generator(device="cuda").manual_seed(seed)
            result=self.pipeline(
                prompt=prompt,
                width=width,
                height=height,
                generator=generator,
                num_inference_steps=int(os.getenv("SDXL_INFERENCE_STEPS","28")),
                guidance_scale=float(os.getenv("SDXL_GUIDANCE_SCALE","6.5")),
                **adapter_kwargs,
            )
            image=result.images[0]
            buffer=BytesIO();image.save(buffer,format="PNG")
            return GeneratedImage(buffer.getvalue(),"image/png",image.width,image.height,{
                "backend":"diffusers-sdxl",
                "conditioning":"IP_ADAPTER_PLUS" if conditioning and conditioning.references else "PROMPT_ONLY",
                "adapterId":conditioning.adapter_id if conditioning else None,
                "adapterRevision":conditioning.adapter_revision if conditioning else None,
                "conditioningReferenceIds":list(conditioning.reference_ids) if conditioning else [],
                "conditioningScales":[r.scale for r in conditioning.references] if conditioning else [],
                "steps":int(os.getenv("SDXL_INFERENCE_STEPS","28")),
                "guidance":float(os.getenv("SDXL_GUIDANCE_SCALE","6.5")),
            })
        except RuntimeError as exc:
            if "out of memory" in str(exc).lower():
                raise bounded_error("GPU_OOM") from None
            raise bounded_error("REFERENCE_CONDITIONING_FAILED" if conditioning else "INTERNAL_TRANSIENT") from None
        except Exception as exc:
            if getattr(exc,"code",None):raise
            raise bounded_error("REFERENCE_CONDITIONING_FAILED" if conditioning else "INTERNAL_TRANSIENT") from None
        finally:
            if conditioning and self.adapter and self.pipeline:
                self.adapter.reset(self.pipeline)

def create_backend(model:ModelEntry,settings:Settings)->VisualInferenceBackend:
    if settings.backend=="test":
        return DeterministicTestBackend(model,settings)
    if model.backend=="SDXL_DIFFUSERS":
        return DiffusersSDXLBackend(model,settings)
    raise bounded_error("MODEL_NOT_SUPPORTED")
