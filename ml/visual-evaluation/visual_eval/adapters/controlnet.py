from dataclasses import dataclass

@dataclass(frozen=True)
class ControlNetSpec:
    repository:str
    mode:str
    status:str

SDXL_CONTROL=ControlNetSpec("diffusers/controlnet-canny-sdxl-1.0","canny","SUPPORTED")
FLUX_CONTROL=ControlNetSpec("","unconfigured","UNVERIFIED_FOR_PINNED_SCHNELL")
