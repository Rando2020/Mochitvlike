from dataclasses import dataclass

@dataclass(frozen=True)
class IPAdapterSpec:
    repository:str
    weight_name:str
    subfolder:str|None=None
    image_encoder:str|None=None
    scale:float=.65

SDXL_IP_ADAPTER=IPAdapterSpec(
    repository="h94/IP-Adapter",
    subfolder="sdxl_models",
    weight_name="ip-adapter-plus_sdxl_vit-h.safetensors",
    scale=.65,
)
FLUX_IP_ADAPTER=IPAdapterSpec(
    repository="XLabs-AI/flux-ip-adapter",
    weight_name="ip_adapter.safetensors",
    image_encoder="openai/clip-vit-large-patch14",
    scale=.7,
)
