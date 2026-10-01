from __future__ import annotations
from typing import Any

def compile_performance_conditioning(bundle: dict[str, Any]) -> dict[str, Any]:
    source=bundle["performance"]
    movement=source["movement"]
    ability=source["ability"]
    return {
        "characterId":source["characterId"],
        "bibleVersion":source["bibleVersion"],
        "movement":{
            "posture":movement["posture"],
            "silhouettePrinciples":list(dict.fromkeys(movement["silhouettePrinciples"])),
            "physicalPrinciples":list(movement["physicalPrinciples"]),
            "mustNotDo":list(movement["mustNotDo"]),
        },
        "ability":{
            "name":ability["name"],
            "variantId":ability["variantId"],
            "variantVersion":ability["variantVersion"],
            "activation":{
                "startPose":ability["activation"]["startPose"],
                "handPositions":list(ability["activation"]["handPositions"]),
                "bodyMotion":list(ability["activation"]["bodyMotion"]),
                "prerequisiteState":list(ability["activation"]["prerequisiteState"]),
            },
            "choreography":ability["choreography"],
            "visualSignature":ability["visualSignature"],
            "vfx":ability["vfx"],
            "cameraLanguage":ability["cameraLanguage"],
            "mustNotDo":list(ability["mustNotDo"]),
        },
        "references":[
            {
                "slot":ref["slot"],
                "assetKey":ref["assetKey"],
                "required":ref["required"],
                "assetId":ref["assetId"],
            } for ref in ability["referenceSheet"]
        ],
    }
