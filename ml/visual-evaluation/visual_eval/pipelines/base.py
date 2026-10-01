from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol
from PIL import Image, ImageDraw

class UnsupportedPhaseError(RuntimeError):
    pass

@dataclass(frozen=True)
class GenerationRequest:
    prompt:str
    seed:int
    width:int
    height:int
    steps:int
    guidance:float
    phase:str
    reference_image:Path|None=None
    control_image:Path|None=None
    lora_path:str|None=None

@dataclass
class GenerationOutput:
    image:Image.Image
    provider_metadata:dict[str,Any]

class VisualPipeline(Protocol):
    def generate(self, request:GenerationRequest)->GenerationOutput: ...

class MockPipeline:
    def __init__(self, architecture:str, model_id:str):
        self.architecture=architecture
        self.model_id=model_id
    def generate(self,request:GenerationRequest)->GenerationOutput:
        # Deterministic CPU-safe artifact for contract tests only.
        v=request.seed & 255
        image=Image.new("RGB",(request.width,request.height),(v,(v*3)%256,(v*7)%256))
        draw=ImageDraw.Draw(image)
        draw.rectangle((10,10,min(250,request.width-10),min(80,request.height-10)),outline=(255,255,255),width=2)
        return GenerationOutput(image,{
            "mock":True,"architecture":self.architecture,"modelId":self.model_id,
            "phase":request.phase,"seed":request.seed
        })
