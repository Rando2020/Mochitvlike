from __future__ import annotations
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

@dataclass(frozen=True)
class ModelRecord:
    id: str
    display_name: str
    repository: str
    revision: str
    artifact_checksum: str | None
    artifact_filename: str | None
    architecture: str
    commercial_use: bool | str
    production_status: str

def load_bundle(path: str | Path) -> dict[str, Any]:
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schemaVersion")!="visual-benchmark-bundle-v1":
        raise ValueError("UNSUPPORTED_BUNDLE_SCHEMA")
    return data

def model_records(bundle: dict[str, Any]) -> list[ModelRecord]:
    result=[]
    for model in bundle["models"]:
        src=model["source"]
        if not src.get("revision") or src["revision"]=="main":
            raise ValueError(f"UNPINNED_MODEL:{model['id']}")
        result.append(ModelRecord(
            id=model["id"],display_name=model["displayName"],
            repository=src["repository"],revision=src["revision"],
            artifact_checksum=src.get("artifactChecksum"),
            artifact_filename=src.get("artifactFilename"),
            architecture=model["architecture"],
            commercial_use=model["license"]["commercialUse"],
            production_status=model["productionStatus"],
        ))
    return result

def get_model(bundle: dict[str, Any], model_id: str) -> ModelRecord:
    for model in model_records(bundle):
        if model.id==model_id:
            return model
    raise ValueError(f"MODEL_NOT_FOUND:{model_id}")

def sha256_file(path: str | Path) -> str:
    digest=hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1024*1024), b""):
            digest.update(block)
    return digest.hexdigest()

def verify_artifact_checksum(model: ModelRecord, snapshot_dir: str | Path) -> tuple[bool, str]:
    if not model.artifact_checksum or not model.artifact_filename:
        return False, "CHECKSUM_NOT_AVAILABLE"
    target=Path(snapshot_dir)/model.artifact_filename
    if not target.exists():
        return False, "CHECKSUM_TARGET_MISSING"
    actual=sha256_file(target)
    return actual==model.artifact_checksum, actual
