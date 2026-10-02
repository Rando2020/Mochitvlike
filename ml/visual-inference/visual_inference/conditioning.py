from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from typing import Sequence

from PIL import Image

from .adapter_registry import ReferenceConditioningAdapterEntry
from .errors import bounded_error
from .models import ProductionFrameSpec,RuntimeReference

ROLE_ORDER={"IDENTITY":0,"VFX_STYLE":1,"COLOR_LANGUAGE":2}
CHARACTER_ROLE_ORDER={"PRIMARY_IDENTITY":0,"PROFILE":1,"FULL_BODY":2,"COSTUME":3,"EXPRESSION":4,"TURNAROUND":5,"OTHER":6}

@dataclass(frozen=True)
class PreparedReference:
    reference_id:str
    checksum:str
    role:str
    character_id:str|None
    ability_id:str|None
    image:Image.Image
    scale:float

@dataclass(frozen=True)
class PreparedConditioning:
    adapter_id:str
    adapter_revision:str
    references:tuple[PreparedReference,...]

    @property
    def reference_ids(self)->tuple[str,...]:
        return tuple(x.reference_id for x in self.references)

class ReferenceConditioningAdapter:
    def __init__(self,entry:ReferenceConditioningAdapterEntry,identity_scale:float,vfx_scale:float,color_scale:float,max_references:int=4):
        self.entry=entry
        self.identity_scale=self._bounded(identity_scale)
        self.vfx_scale=self._bounded(vfx_scale)
        self.color_scale=self._bounded(color_scale)
        self.max_references=max(1,min(max_references,4))
        self.loaded=False

    @staticmethod
    def _bounded(value:float)->float:
        if value<0.0 or value>1.0:
            raise bounded_error("REFERENCE_CONDITIONING_FAILED")
        return value

    def _verify_artifact(self)->None:
        if not self.entry.artifact_checksum:return
        try:
            from huggingface_hub import hf_hub_download
            path=hf_hub_download(
                repo_id=self.entry.repository,
                filename=f"{self.entry.subfolder}/{self.entry.weight_name}",
                revision=self.entry.revision,
            )
            digest=sha256()
            with open(path,"rb") as handle:
                for chunk in iter(lambda:handle.read(1024*1024),b""):digest.update(chunk)
            if digest.hexdigest().lower()!=self.entry.artifact_checksum.lower():
                raise bounded_error("ADAPTER_REVISION_MISMATCH")
        except Exception as exc:
            if getattr(exc,"code",None):raise
            raise bounded_error("ADAPTER_LOAD_FAILED") from exc

    def load(self,pipeline)->None:
        if self.loaded:return
        self._verify_artifact()
        try:
            pipeline.load_ip_adapter(
                self.entry.repository,
                subfolder=self.entry.subfolder,
                weight_name=self.entry.weight_name,
                revision=self.entry.revision,
            )
            self.loaded=True
        except Exception as exc:
            raise bounded_error("ADAPTER_LOAD_FAILED") from exc

    def _assert_reference_approved(self,reference:RuntimeReference)->None:
        spec=reference.spec
        if spec.benchmarkOnly or not spec.approved or not spec.creatorApproved or spec.status!="APPROVED":
            raise bounded_error("REFERENCE_ROLE_UNSUPPORTED")

    def _to_image(self,reference:RuntimeReference)->Image.Image:
        try:
            return Image.open(BytesIO(reference.content)).convert("RGB")
        except Exception as exc:
            raise bounded_error("REFERENCE_CONDITIONING_FAILED") from exc

    def _identity_reference(self,references:Sequence[RuntimeReference],character_id:str)->RuntimeReference:
        candidates=[
            r for r in references
            if r.spec.type=="CHARACTER" and r.spec.characterId==character_id and r.spec.referenceRole=="PRIMARY_IDENTITY"
        ]
        for r in candidates:self._assert_reference_approved(r)
        if not candidates:
            raise bounded_error("IDENTITY_REFERENCE_REQUIRED")
        return sorted(candidates,key=lambda r:r.spec.id)[0]

    def _ability_reference_role(self,reference:RuntimeReference)->str|None:
        slot=reference.spec.abilitySlot
        if slot in {"VFX_ISOLATION","SHAPE_LANGUAGE"}:return "VFX_STYLE"
        if slot=="PALETTE":return "COLOR_LANGUAGE"
        if slot in {"ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","MOTION_ARROWS"}:return None
        return None

    def prepare(self,references:Sequence[RuntimeReference],spec:ProductionFrameSpec)->PreparedConditioning:
        character_ids=sorted({c.characterId for c in spec.characters})
        if len(character_ids)>1:
            raise bounded_error("MULTI_CHARACTER_REFERENCE_CONDITIONING_NOT_SUPPORTED")
        if not character_ids:
            return PreparedConditioning(self.entry.id,self.entry.revision,())
        character_id=character_ids[0]
        identity=self._identity_reference(references,character_id)
        selected:list[tuple[str,RuntimeReference,float]]=[]
        selected.append(("IDENTITY",identity,self.identity_scale))

        ability_ids={str(a.get("abilityId")) for a in spec.abilityConstraints if a.get("characterId")==character_id and a.get("abilityId")}
        ability_refs=[]
        for r in references:
            if r.spec.type!="ABILITY":continue
            self._assert_reference_approved(r)
            if r.spec.characterId!=character_id:
                raise bounded_error("REFERENCE_CHARACTER_MISMATCH")
            if r.spec.abilityId not in ability_ids:
                continue
            role=self._ability_reference_role(r)
            if role:
                ability_refs.append((role,r))
        ability_refs.sort(key=lambda x:(ROLE_ORDER[x[0]],x[1].spec.abilitySlot or "",x[1].spec.id))
        used_roles=set()
        for role,r in ability_refs:
            if role in used_roles:continue
            used_roles.add(role)
            scale=self.vfx_scale if role=="VFX_STYLE" else self.color_scale
            selected.append((role,r,scale))
            if len(selected)>=self.max_references:break

        prepared=[]
        for role,r,scale in selected:
            if r.spec.characterId and r.spec.characterId!=character_id:
                raise bounded_error("REFERENCE_CHARACTER_MISMATCH")
            prepared.append(PreparedReference(
                reference_id=r.spec.id,
                checksum=r.spec.checksum,
                role=role,
                character_id=r.spec.characterId,
                ability_id=r.spec.abilityId,
                image=self._to_image(r),
                scale=scale,
            ))
        return PreparedConditioning(self.entry.id,self.entry.revision,tuple(prepared))

    def apply(self,pipeline,conditioning:PreparedConditioning)->dict:
        if not conditioning.references:return {}
        if not self.loaded:self.load(pipeline)
        images=[r.image for r in conditioning.references]
        scales=[r.scale for r in conditioning.references]
        try:
            pipeline.set_ip_adapter_scale([scales])
        except Exception as exc:
            raise bounded_error("REFERENCE_CONDITIONING_FAILED") from exc
        return {"ip_adapter_image":[images]}

    def reset(self,pipeline)->None:
        if not self.loaded:return
        try:
            pipeline.set_ip_adapter_scale(0.0)
        except Exception:
            pass
