from __future__ import annotations
import hashlib
from dataclasses import dataclass
from typing import Any
from .conditioning.abilities import canonical_ability_constraints,shot_specific_ability_variables

@dataclass(frozen=True)
class CompiledPrompt:
    prompt: str
    canonical_constraints: tuple[str, ...]
    shot_variables: tuple[str, ...]
    prompt_hash: str

def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def compile_visual_prompt(bundle: dict[str, Any], scenario: dict[str, Any], ability: bool=False) -> CompiledPrompt:
    if ability:
        canonical=tuple(canonical_ability_constraints(bundle))
        variables=tuple(shot_specific_ability_variables(scenario))
        prompt=(
            "CANONICAL CONSTRAINTS — these may not be overridden by shot direction:\n"
            + "\n".join("- "+x for x in canonical)
            + "\nSHOT-SPECIFIC VARIABLES — these may vary while preserving all canonical constraints:\n"
            + "\n".join("- "+x for x in variables)
            + "\nRender one original fictional anime production frame. Preserve physical contact and readable hand geography. "
              "Do not turn an inward transfer into a projectile, lightning attack, or outward explosion."
        )
    else:
        canonical=("Original benchmark character identity and costume must remain stable.",)
        variables=(scenario["prompt"],)
        prompt=canonical[0]+"\nSHOT-SPECIFIC REQUIREMENT:\n"+scenario["prompt"]
    return CompiledPrompt(prompt,canonical,variables,_hash(prompt))
