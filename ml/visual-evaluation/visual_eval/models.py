from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel,Field,ConfigDict

class StrictModel(BaseModel):
    model_config=ConfigDict(extra="forbid")

class ReferenceAssetProvenance(StrictModel):
    asset_id:str
    slot:str
    path:str
    source:Literal["SYNTHETIC","OWNED","LICENSED"]
    benchmark_only:bool=True
    creator_approved:bool=False
    checksum:str
    generated_by_model_id:str|None=None
    generated_by_revision:str|None=None

class HumanReview(StrictModel):
    technique_recognizability:float|None=Field(default=None,ge=0,le=1)
    character_consistency:float|None=Field(default=None,ge=0,le=1)
    activation_pose_consistency:float|None=Field(default=None,ge=0,le=1)
    vfx_consistency:float|None=Field(default=None,ge=0,le=1)
    palette_consistency:float|None=Field(default=None,ge=0,le=1)
    motion_language_plausibility:float|None=Field(default=None,ge=0,le=1)
    production_usability:float|None=Field(default=None,ge=0,le=1)
    notes:list[str]=Field(default_factory=list)

class EvaluationMetadata(StrictModel):
    model_id:str
    model_revision:str
    checksum_verified:bool
    checksum_detail:str
    architecture:str
    phase:str
    scenario_id:str
    seed:int
    prompt_hash:str
    model_settings:dict[str,Any]
    reference_ids:list[str]
    lora_ids:list[str]
    controlnet:dict[str,Any]|None
    performance_bible_version:int|None
    ability_id:str|None
    ability_variant_id:str|None
    ability_contract_checksum:str|None
    latency_ms:float
    peak_vram_mb:float|None
    output_checksum:str
    timestamp:str
    external_cost_usd:float|None=None

class EvaluationResult(StrictModel):
    status:Literal["COMPLETED","FAILED","SKIPPED"]
    metadata:EvaluationMetadata|None=None
    metrics:dict[str,Any]=Field(default_factory=dict)
    human_review:HumanReview=Field(default_factory=HumanReview)
    artifact_refs:list[str]=Field(default_factory=list)
    error_code:str|None=None
    error_message:str|None=None

class ProductionApprovalRecommendation(StrictModel):
    model_id:str
    benchmark_complete:bool
    character_evidence_complete:bool
    ability_evidence_complete:bool
    checksum_verified:bool
    license_ready:bool
    adapter_compatibility:str
    critical_failures:list[str]
    recommendation:Literal["CONTINUE_EVALUATION","ELIGIBLE_FOR_PRODUCTION_REVIEW","REJECT"]
