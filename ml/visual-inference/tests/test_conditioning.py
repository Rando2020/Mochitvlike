import pytest
from conftest import png,reference,settings,spec
from visual_inference.adapter_registry import REFERENCE_CONDITIONING_ADAPTERS,resolve_reference_conditioning_adapter
from visual_inference.conditioning import ReferenceConditioningAdapter
from visual_inference.errors import InferenceError
from visual_inference.models import ProductionFrameSpec,ReferenceSpec,RuntimeReference

ENTRY=REFERENCE_CONDITIONING_ADAPTERS["ip-adapter-plus-sdxl-vith"]

def runtime_ref(**overrides):
    data=overrides.pop("data",png())
    parsed=ReferenceSpec.model_validate(reference(data,**overrides))
    return RuntimeReference(parsed,data,"image/png",256,256)

def one_character_spec(references=None,ability=False):
    refs=references or []
    value=spec(
      characters=[{
        "characterId":"char_orin","name":"Orin","visualConcept":"weathered healer","visualDescription":"dark hair",
        "costumeRequirements":["field coat"],"continuityConstraints":[],"performanceBibleVersion":1,
        "referenceAssetIds":[r.spec.id for r in refs if r.spec.type=="CHARACTER"]
      }],
      references=[r.spec.model_dump(mode="json") for r in refs],
      abilityConstraints=[{"characterId":"char_orin","abilityId":"ability_burden_draw"}] if ability else []
    )
    return ProductionFrameSpec.model_validate(value)

def adapter(**kwargs):
    return ReferenceConditioningAdapter(
      ENTRY,kwargs.get("identity_scale",0.65),kwargs.get("vfx_scale",0.30),kwargs.get("color_scale",0.20),kwargs.get("max_references",4)
    )

def test_adapter_registry_pinned():
    assert ENTRY.repository=="h94/IP-Adapter"
    assert ENTRY.revision=="9bf28b38530e55ffa91c6d82e5161a982c22f284"
    assert ENTRY.weight_name=="ip-adapter-plus_sdxl_vit-h.safetensors"
    assert ENTRY.artifact_checksum=="3f5062b8400c94b7159665b21ba5c62acdcd7682262743d7f2aefedef00e6581"

def test_adapter_license_and_status():
    assert ENTRY.license=="apache-2.0"
    assert ENTRY.commercial_use is True
    assert ENTRY.production_status=="CANDIDATE"

def test_unknown_adapter_rejected():
    with pytest.raises(InferenceError,match="ADAPTER_NOT_SUPPORTED"):resolve_reference_conditioning_adapter("evil","SDXL",True)

def test_candidate_adapter_development_allowed():
    assert resolve_reference_conditioning_adapter(ENTRY.id,"SDXL",True,ENTRY.revision).id==ENTRY.id

def test_stale_adapter_revision_rejected():
    with pytest.raises(InferenceError,match="ADAPTER_REVISION_MISMATCH"):
        resolve_reference_conditioning_adapter(ENTRY.id,"SDXL",True,"stale")

def test_candidate_adapter_production_rejected():
    with pytest.raises(InferenceError,match="ADAPTER_NOT_SUPPORTED"):resolve_reference_conditioning_adapter(ENTRY.id,"SDXL",False)

def test_primary_identity_selected():
    primary=runtime_ref(id="p",referenceRole="PRIMARY_IDENTITY")
    profile=runtime_ref(id="q",referenceRole="PROFILE")
    prepared=adapter().prepare([profile,primary],one_character_spec([profile,primary]))
    assert prepared.reference_ids==("p",) and prepared.references[0].role=="IDENTITY"

def test_profile_does_not_replace_primary():
    profile=runtime_ref(referenceRole="PROFILE")
    with pytest.raises(InferenceError,match="IDENTITY_REFERENCE_REQUIRED"):adapter().prepare([profile],one_character_spec([profile]))

@pytest.mark.parametrize("status",["UPLOADED","REVIEW_REQUIRED","REJECTED","ARCHIVED"])
def test_nonapproved_lifecycle_excluded(status):
    ref=runtime_ref(status=status,approved=False,creatorApproved=False)
    with pytest.raises(InferenceError):adapter().prepare([ref],one_character_spec([ref]))

def test_benchmark_reference_excluded():
    ref=runtime_ref(benchmarkOnly=True,approved=False,creatorApproved=False)
    with pytest.raises(InferenceError):adapter().prepare([ref],one_character_spec([ref]))

def test_wrong_character_primary_missing():
    ref=runtime_ref(characterId="char_mara")
    with pytest.raises(InferenceError,match="IDENTITY_REFERENCE_REQUIRED"):adapter().prepare([ref],one_character_spec([ref]))

def test_wrong_character_ability_rejected():
    identity=runtime_ref(id="identity")
    ability=runtime_ref(id="vfx",type="ABILITY",characterId="char_mara",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="VFX_ISOLATION")
    with pytest.raises(InferenceError,match="REFERENCE_CHARACTER_MISMATCH"):adapter().prepare([identity,ability],one_character_spec([identity,ability],ability=True))

def test_checksum_identity_preserved():
    identity=runtime_ref(id="identity")
    prepared=adapter().prepare([identity],one_character_spec([identity]))
    assert prepared.references[0].checksum==identity.spec.checksum

def test_activation_pose_is_not_ip_adapter_role():
    identity=runtime_ref(id="identity")
    pose=runtime_ref(id="pose",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="ACTIVATION_POSE")
    prepared=adapter().prepare([identity,pose],one_character_spec([identity,pose],ability=True))
    assert "pose" not in prepared.reference_ids

def test_vfx_isolation_maps_to_vfx_style():
    identity=runtime_ref(id="identity")
    vfx=runtime_ref(id="vfx",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="VFX_ISOLATION")
    prepared=adapter().prepare([identity,vfx],one_character_spec([identity,vfx],ability=True))
    assert [(x.reference_id,x.role) for x in prepared.references]==[("identity","IDENTITY"),("vfx","VFX_STYLE")]

def test_shape_language_maps_to_vfx_style_but_dedupes_role():
    identity=runtime_ref(id="identity")
    a=runtime_ref(id="a",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="VFX_ISOLATION")
    b=runtime_ref(id="b",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="SHAPE_LANGUAGE")
    prepared=adapter().prepare([identity,b,a],one_character_spec([identity,b,a],ability=True))
    assert len([x for x in prepared.references if x.role=="VFX_STYLE"])==1

def test_palette_maps_to_color_language():
    identity=runtime_ref(id="identity")
    palette=runtime_ref(id="palette",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="PALETTE")
    prepared=adapter().prepare([identity,palette],one_character_spec([identity,palette],ability=True))
    assert prepared.references[-1].role=="COLOR_LANGUAGE"

def test_reference_count_bounded():
    assert adapter(max_references=99).max_references==4

@pytest.mark.parametrize("value",[-0.1,1.1])
def test_conditioning_scale_bounded(value):
    with pytest.raises(InferenceError,match="REFERENCE_CONDITIONING_FAILED"):adapter(identity_scale=value)

def test_deterministic_ordering():
    identity=runtime_ref(id="z")
    palette=runtime_ref(id="palette",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="PALETTE")
    vfx=runtime_ref(id="vfx",type="ABILITY",characterId="char_orin",abilityId="ability_burden_draw",referenceRole=None,abilitySlot="VFX_ISOLATION")
    s=one_character_spec([identity,palette,vfx],ability=True)
    assert adapter().prepare([palette,vfx,identity],s).reference_ids==adapter().prepare([identity,vfx,palette],s).reference_ids

def test_multi_character_fails_closed():
    identity=runtime_ref(id="identity")
    s=ProductionFrameSpec.model_validate(spec(
      characters=[
        {"characterId":"char_orin","name":"Orin","visualConcept":"x","visualDescription":"x","costumeRequirements":[],"continuityConstraints":[],"performanceBibleVersion":1,"referenceAssetIds":["identity"]},
        {"characterId":"char_mara","name":"Mara","visualConcept":"y","visualDescription":"y","costumeRequirements":[],"continuityConstraints":[],"performanceBibleVersion":1,"referenceAssetIds":[]}
      ],
      references=[identity.spec.model_dump(mode="json")]
    ))
    with pytest.raises(InferenceError,match="MULTI_CHARACTER_REFERENCE_CONDITIONING_NOT_SUPPORTED"):adapter().prepare([identity],s)

class Pipe:
    def __init__(self):self.loaded=0;self.scales=None
    def load_ip_adapter(self,*args,**kwargs):self.loaded+=1;self.args=args;self.kwargs=kwargs
    def set_ip_adapter_scale(self,value):self.scales=value

def test_adapter_loads_exact_revision_once(monkeypatch):
    p=Pipe();a=adapter();monkeypatch.setattr(a,"_verify_artifact",lambda:None);a.load(p);a.load(p)
    assert p.loaded==1 and p.kwargs["revision"]==ENTRY.revision and p.kwargs["weight_name"]==ENTRY.weight_name

def test_apply_forwards_bounded_scales_and_images():
    identity=runtime_ref(id="identity")
    prepared=adapter().prepare([identity],one_character_spec([identity]))
    p=Pipe();a=adapter();a.loaded=True;result=a.apply(p,prepared)
    assert p.scales==[[0.65]] and len(result["ip_adapter_image"][0])==1
