from __future__ import annotations

from dataclasses import dataclass

from .errors import bounded_error

@dataclass(frozen=True)
class ReferenceConditioningAdapterEntry:
    id: str
    display_name: str
    repository: str
    revision: str
    architecture: str
    conditioning_type: str
    supported_reference_roles: tuple[str,...]
    subfolder: str
    weight_name: str
    artifact_checksum: str | None
    license: str
    commercial_use: bool | str
    production_status: str

REFERENCE_CONDITIONING_ADAPTERS: dict[str,ReferenceConditioningAdapterEntry] = {
    "ip-adapter-plus-sdxl-vith": ReferenceConditioningAdapterEntry(
        id="ip-adapter-plus-sdxl-vith",
        display_name="IP-Adapter Plus SDXL ViT-H",
        repository="h94/IP-Adapter",
        revision="9bf28b38530e55ffa91c6d82e5161a982c22f284",
        architecture="SDXL",
        conditioning_type="IP_ADAPTER",
        supported_reference_roles=("IDENTITY","VFX_STYLE","COLOR_LANGUAGE"),
        subfolder="sdxl_models",
        weight_name="ip-adapter-plus_sdxl_vit-h.safetensors",
        artifact_checksum="3f5062b8400c94b7159665b21ba5c62acdcd7682262743d7f2aefedef00e6581",
        license="apache-2.0",
        commercial_use=True,
        production_status="CANDIDATE",
    )
}

def resolve_reference_conditioning_adapter(adapter_id:str,architecture:str,development_override:bool,expected_revision:str|None=None)->ReferenceConditioningAdapterEntry:
    entry=REFERENCE_CONDITIONING_ADAPTERS.get(adapter_id)
    if not entry:
        raise bounded_error("ADAPTER_NOT_SUPPORTED")
    if entry.architecture!=architecture:
        raise bounded_error("ADAPTER_NOT_SUPPORTED")
    if expected_revision and expected_revision!=entry.revision:
        raise bounded_error("ADAPTER_REVISION_MISMATCH")
    if not development_override and entry.production_status!="APPROVED":
        raise bounded_error("ADAPTER_NOT_SUPPORTED")
    return entry
