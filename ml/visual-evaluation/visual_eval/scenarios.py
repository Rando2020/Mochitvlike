from __future__ import annotations
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class Scenario:
    id: str
    category: str
    title: str
    seed: int
    prompt: str
    references: tuple[str, ...]
    pose_reference: str | None
    raw: dict[str, Any]

def visual_scenarios(bundle: dict[str, Any]) -> list[Scenario]:
    return [
        Scenario(
            id=x["id"],category=x["category"],title=x["title"],seed=int(x["seed"]),
            prompt=x["prompt"],references=tuple(x["references"]),
            pose_reference=x.get("poseReference"),raw=x
        ) for x in bundle["scenarios"]
    ]

def ability_scenarios(bundle: dict[str, Any]) -> list[Scenario]:
    results=[]
    for x in bundle["abilityScenarios"]:
        prompt=(
            f"{x['title']}. Camera: {x['cameraAngle']}. Lighting: {x['lighting']}. "
            "Preserve canonical technique identity: "+"; ".join(x["promptContract"]["mustPreserve"])+"."
        )
        results.append(Scenario(
            id=x["id"],category="ABILITY_CONSISTENCY",title=x["title"],seed=int(x["seed"]),
            prompt=prompt,references=tuple(x["promptContract"]["referenceAssetKeys"]),
            pose_reference=None,raw=x
        ))
    return results

def get_scenario(bundle: dict[str, Any], scenario_id: str, ability: bool=False) -> Scenario:
    source=ability_scenarios(bundle) if ability else visual_scenarios(bundle)
    for scenario in source:
        if scenario.id==scenario_id:
            return scenario
    raise ValueError(f"SCENARIO_NOT_FOUND:{scenario_id}")
