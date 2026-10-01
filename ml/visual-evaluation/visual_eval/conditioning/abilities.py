from __future__ import annotations
import hashlib
import json
from typing import Any
from .performance import compile_performance_conditioning

def stable_json(value: Any) -> str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)

def ability_contract_checksum(bundle: dict[str, Any]) -> str:
    conditioning=compile_performance_conditioning(bundle)
    return hashlib.sha256(stable_json(conditioning["ability"]).encode("utf-8")).hexdigest()

def canonical_ability_constraints(bundle: dict[str, Any]) -> list[str]:
    data=compile_performance_conditioning(bundle)
    ability=data["ability"]
    visual=ability["visualSignature"]
    vfx=ability["vfx"]
    start=ability["activation"]["startPose"]
    return [
        f"Technique: {ability['name']} variant {ability['variantId']}.",
        f"Start stance: {start['stance']}; facing {start['facing']}; weight {start['weightDistribution']}.",
        "Hand positions: "+"; ".join(ability["activation"]["handPositions"])+".",
        f"Canonical silhouette: {visual['silhouette']}",
        f"Canonical energy shape: {visual['energyShape']}",
        "Canonical palette: "+", ".join(visual["palette"])+".",
        "Motion language: "+"; ".join(visual["motionLanguage"])+".",
        f"Travel behavior: {vfx['travelBehavior']}",
        f"Impact behavior: {vfx['impactBehavior']}",
        f"Aftermath behavior: {vfx['aftermathBehavior']}",
        "Forbidden drift: "+"; ".join(ability["mustNotDo"])+".",
    ]

def shot_specific_ability_variables(scenario: dict[str, Any]) -> list[str]:
    return [
        f"Camera angle: {scenario['cameraAngle']}.",
        f"Lighting: {scenario['lighting']}.",
        f"Episode context: {scenario['episodeNumber']}.",
        "Additional characters: "+(", ".join(scenario["withCharacterIds"]) if scenario["withCharacterIds"] else "none")+".",
    ]
