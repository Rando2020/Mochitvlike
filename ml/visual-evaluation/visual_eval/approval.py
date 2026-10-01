from __future__ import annotations
from .models import ProductionApprovalRecommendation

def recommend_production_review(
    *,model_id:str,benchmark_complete:bool,character_evidence_complete:bool,
    ability_evidence_complete:bool,checksum_verified:bool,license_ready:bool,
    adapter_compatibility:str,critical_failures:list[str]
)->ProductionApprovalRecommendation:
    if critical_failures:
        recommendation="REJECT"
    elif all([benchmark_complete,character_evidence_complete,ability_evidence_complete,checksum_verified,license_ready]) and adapter_compatibility=="SUPPORTED":
        recommendation="ELIGIBLE_FOR_PRODUCTION_REVIEW"
    else:
        recommendation="CONTINUE_EVALUATION"
    return ProductionApprovalRecommendation(
        model_id=model_id,benchmark_complete=benchmark_complete,
        character_evidence_complete=character_evidence_complete,
        ability_evidence_complete=ability_evidence_complete,
        checksum_verified=checksum_verified,license_ready=license_ready,
        adapter_compatibility=adapter_compatibility,critical_failures=critical_failures,
        recommendation=recommendation
    )
