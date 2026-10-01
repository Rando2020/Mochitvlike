from dataclasses import dataclass

@dataclass(frozen=True)
class LoRAInput:
    path_or_repo:str
    weight_name:str|None=None
    adapter_name:str="character"
    weight:float=1.0

def validate_lora(input:LoRAInput)->LoRAInput:
    if not input.path_or_repo.strip():
        raise ValueError("LORA_SOURCE_REQUIRED")
    if input.weight<=0 or input.weight>2:
        raise ValueError("LORA_WEIGHT_OUT_OF_RANGE")
    return input
