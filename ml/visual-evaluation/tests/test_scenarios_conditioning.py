from pathlib import Path
import pytest
from visual_eval.scenarios import visual_scenarios,ability_scenarios,get_scenario
from visual_eval.conditioning.character import compile_character_conditioning
from visual_eval.conditioning.performance import compile_performance_conditioning
from visual_eval.conditioning.abilities import ability_contract_checksum,canonical_ability_constraints,shot_specific_ability_variables
from visual_eval.prompting import compile_visual_prompt
from visual_eval.registry import load_bundle

B=load_bundle(Path(__file__).parents[1]/"contracts"/"benchmark.v1.json")

def test_visual_scenario_count_matches_contract(): assert len(visual_scenarios(B))==36
def test_ability_scenario_count(): assert len(ability_scenarios(B))==6
def test_scenario_ids_unique(): assert len({x.id for x in visual_scenarios(B)})==36
def test_ability_ids_unique(): assert len({x.id for x in ability_scenarios(B)})==6
def test_seeds_are_deterministic(): assert [x.seed for x in ability_scenarios(B)]==[x.seed for x in ability_scenarios(B)]
def test_kael_character_bridge(): assert compile_character_conditioning(B,["kael"])["characters"][0]["name"]=="Kael"
def test_unknown_character_rejected():
    with pytest.raises(ValueError,match="CHARACTER_FIXTURE_NOT_FOUND"): compile_character_conditioning(B,["missing"])
def test_orin_fixture_bridge(): assert compile_performance_conditioning(B)["characterId"]=="char_orin"
def test_burden_draw_fixture_bridge(): assert compile_performance_conditioning(B)["ability"]["name"]=="Burden Draw"
def test_historical_variant_is_v1(): assert compile_performance_conditioning(B)["ability"]["variantVersion"]==1
def test_ability_palette_preserved(): assert "muted wound-crimson" in compile_performance_conditioning(B)["ability"]["visualSignature"]["palette"]
def test_inward_effect_direction_preserved(): assert "never away as a projectile" in compile_performance_conditioning(B)["ability"]["vfx"]["travelBehavior"]
def test_contact_hands_preserved(): assert any("contact" in x for x in compile_performance_conditioning(B)["ability"]["activation"]["handPositions"])
def test_reference_sheet_has_nine_slots(): assert len(compile_performance_conditioning(B)["references"])==9
def test_ability_checksum_deterministic(): assert ability_contract_checksum(B)==ability_contract_checksum(B)
def test_base_prompt_has_canonical_and_variable_split():
    s=get_scenario(B,"char-closeup").raw;p=compile_visual_prompt(B,s,False)
    assert p.canonical_constraints and p.shot_variables and "SHOT-SPECIFIC" in p.prompt
def test_ability_prompt_has_strict_canonical_section():
    s=ability_scenarios(B)[0].raw;p=compile_visual_prompt(B,s,True)
    assert "CANONICAL CONSTRAINTS" in p.prompt and "may not be overridden" in p.prompt
def test_ability_prompt_blocks_projectile_drift():
    s=ability_scenarios(B)[0].raw;p=compile_visual_prompt(B,s,True)
    assert "Do not turn an inward transfer into a projectile" in p.prompt
def test_shot_variables_do_not_contain_canonical_palette():
    s=ability_scenarios(B)[0].raw
    vars=" ".join(shot_specific_ability_variables(s))
    assert "wound-crimson" not in vars
def test_unknown_scenario_rejected():
    with pytest.raises(ValueError,match="SCENARIO_NOT_FOUND"): get_scenario(B,"missing")
