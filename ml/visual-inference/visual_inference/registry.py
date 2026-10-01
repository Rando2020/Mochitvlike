from __future__ import annotations

from dataclasses import dataclass

@dataclass(frozen=True)
class ModelEntry:
    model_id: str
    repository: str
    revision: str
    architecture: str
    production_status: str
    backend: str

MODEL_REGISTRY: dict[str, ModelEntry] = {
    "animagine-xl-4.0": ModelEntry(
        model_id="animagine-xl-4.0",
        repository="cagliostrolab/animagine-xl-4.0",
        revision="2b7c1b397761bf5bd3cc42e5b39ec99314a75a96",
        architecture="SDXL",
        production_status="CANDIDATE",
        backend="SDXL_DIFFUSERS",
    ),
    "illustrious-xl-v2.0": ModelEntry(
        model_id="illustrious-xl-v2.0",
        repository="OnomaAIResearch/Illustrious-XL-v2.0",
        revision="69459c1fe6f46db41ab31e6114f05acc0e06bcaa",
        architecture="SDXL",
        production_status="CANDIDATE",
        backend="SDXL_DIFFUSERS",
    ),
    "flux.1-schnell": ModelEntry(
        model_id="flux.1-schnell",
        repository="black-forest-labs/FLUX.1-schnell",
        revision="cfac132b798278bc25d0d8a8608dc4522b13c615",
        architecture="FLUX",
        production_status="CANDIDATE",
        backend="UNSUPPORTED_V1",
    ),
}

def resolve_model(model_id: str, revision: str, architecture: str, development_override: bool, dev_model_id: str | None) -> ModelEntry:
    entry = MODEL_REGISTRY.get(model_id)
    if entry is None or entry.backend == "UNSUPPORTED_V1":
        from .errors import bounded_error
        raise bounded_error("MODEL_NOT_SUPPORTED")
    if revision != entry.revision:
        from .errors import bounded_error
        raise bounded_error("MODEL_REVISION_MISMATCH")
    if architecture != entry.architecture:
        from .errors import bounded_error
        raise bounded_error("MODEL_REVISION_MISMATCH")
    if development_override:
        if dev_model_id and model_id != dev_model_id:
            from .errors import bounded_error
            raise bounded_error("MODEL_NOT_SUPPORTED")
    elif entry.production_status != "APPROVED":
        from .errors import bounded_error
        raise bounded_error("MODEL_NOT_SUPPORTED")
    return entry
