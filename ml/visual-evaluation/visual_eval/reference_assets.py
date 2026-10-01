from __future__ import annotations
import hashlib
from pathlib import Path
from typing import Callable,Any
from PIL import Image
from .models import ReferenceAssetProvenance

def image_checksum(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def create_reference_manifest(
    reference_sheet:list[dict[str,Any]],
    output_dir:Path,
    generator:Callable[[dict[str,Any],Path],None],
    generated_by_model_id:str|None=None,
    generated_by_revision:str|None=None,
)->list[ReferenceAssetProvenance]:
    output_dir.mkdir(parents=True,exist_ok=True)
    records=[]
    for ref in reference_sheet:
        path=output_dir/f"{ref['assetKey']}.png"
        generator(ref,path)
        if not path.exists():raise RuntimeError("REFERENCE_GENERATOR_DID_NOT_WRITE_ASSET")
        records.append(ReferenceAssetProvenance(
            asset_id=ref["assetKey"],slot=ref["slot"],path=str(path),
            source="SYNTHETIC",benchmark_only=True,creator_approved=False,
            checksum=image_checksum(path),generated_by_model_id=generated_by_model_id,
            generated_by_revision=generated_by_revision,
        ))
    return records

def mock_reference_generator(ref:dict[str,Any],path:Path)->None:
    digest=hashlib.sha256(ref["assetKey"].encode()).digest()
    image=Image.new("RGB",(128,128),(digest[0],digest[1],digest[2]))
    image.save(path)
