from __future__ import annotations
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class MetricEvidence:
    value:float|None
    status:str
    reason:str|None=None
    details:dict[str,Any]|None=None

def semantic_similarity(*_args,**_kwargs)->MetricEvidence:
    # Deliberately no fabricated CLIP score in the base package.
    # A GPU/metrics environment may replace this with a pinned embedding model.
    return MetricEvidence(None,"NOT_EXECUTED","SEMANTIC_MODEL_NOT_CONFIGURED")
