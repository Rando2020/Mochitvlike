from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Literal

class Phase(str, Enum):
    BASE = "BASE"
    REFERENCE = "REFERENCE"
    STRUCTURAL = "STRUCTURAL"
    CHARACTER_LORA = "CHARACTER_LORA"
    ABILITY_CONSISTENCY = "ABILITY_CONSISTENCY"

Support = Literal["SUPPORTED", "EXPERIMENTAL", "UNVERIFIED", "UNSUPPORTED"]

@dataclass(frozen=True)
class InferenceConfig:
    steps: int
    guidance: float
    width: int = 1024
    height: int = 1024
    dtype: str = "float16"
    scheduler: str = "MODEL_DEFAULT"

@dataclass(frozen=True)
class AdapterSupport:
    ip_adapter: Support
    controlnet: Support
    lora: Support

MODEL_INFERENCE = {
    "animagine-xl-4.0": InferenceConfig(steps=28, guidance=5.0),
    "illustrious-xl-v2.0": InferenceConfig(steps=28, guidance=5.0),
    "flux.1-schnell": InferenceConfig(steps=4, guidance=0.0, dtype="bfloat16"),
}

MODEL_ADAPTER_SUPPORT = {
    "animagine-xl-4.0": AdapterSupport("SUPPORTED", "SUPPORTED", "SUPPORTED"),
    "illustrious-xl-v2.0": AdapterSupport("SUPPORTED", "SUPPORTED", "SUPPORTED"),
    "flux.1-schnell": AdapterSupport("EXPERIMENTAL", "UNVERIFIED", "SUPPORTED"),
}

def config_for(model_id: str) -> InferenceConfig:
    try:
        return MODEL_INFERENCE[model_id]
    except KeyError as exc:
        raise ValueError(f"UNKNOWN_MODEL:{model_id}") from exc
