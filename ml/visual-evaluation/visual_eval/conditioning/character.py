from __future__ import annotations
from typing import Any

def compile_character_conditioning(bundle: dict[str, Any], character_ids: list[str] | tuple[str, ...]) -> dict[str, Any]:
    by_id={c["id"]:c for c in bundle["characters"]}
    result=[]
    for character_id in character_ids:
        character=by_id.get(character_id)
        if not character:
            raise ValueError(f"CHARACTER_FIXTURE_NOT_FOUND:{character_id}")
        result.append({
            "id":character["id"],
            "name":character["name"],
            "appearance":character["appearance"],
            "costume":character["costume"],
            "palette":list(character["palette"]),
        })
    return {"characters":result}
