from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class ModelSpec(StrictModel):
    modelId: str
    revision: str
    architecture: Literal["SDXL","SD3","FLUX","OTHER"]
    developmentOverride: bool

class OutputSpec(StrictModel):
    width: int = Field(ge=256, le=2048)
    height: int = Field(ge=256, le=2048)
    aspectRatio: str

    @field_validator("width","height")
    @classmethod
    def multiple_of_8(cls, value: int) -> int:
        if value % 8:
            raise ValueError("dimensions must be multiples of 8")
        return value

class ProvenancePermissions(StrictModel):
    productionUse: bool | None = None
    commercialUse: bool | None = None
    modelConditioning: bool | None = None
    redistribution: bool | None = None

class Provenance(StrictModel):
    source: Literal["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]
    creatorNameOrId: str | None = None
    licenseIdOrDescription: str | None = None
    sourceUrlOrRecord: str | None = None
    permissions: ProvenancePermissions
    projectSpecific: bool | None = None
    notes: str | None = None

class ReferenceSpec(StrictModel):
    id: str
    type: Literal["CHARACTER","STYLE","LOCATION","POSE","DEPTH","LINEART","ABILITY","PROP"]
    assetUrl: HttpUrl
    checksum: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    source: Literal["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]
    approved: bool
    benchmarkOnly: bool
    creatorApproved: bool
    characterId: str | None
    abilityId: str | None
    modelCompatibility: list[str]
    status: Literal["UPLOADED","REVIEW_REQUIRED","APPROVED","REJECTED","ARCHIVED"] | None = None
    storagePath: str | None = None
    referenceRole: Literal["PRIMARY_IDENTITY","PROFILE","FULL_BODY","COSTUME","EXPRESSION","TURNAROUND","OTHER"] | None = None
    abilitySlot: Literal["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"] | None = None
    locationId: str | None = None
    propId: str | None = None
    provenance: Provenance | None = None

class CreativeDirection(StrictModel):
    visualStyleDescription: str
    colorLanguage: str
    lightingLanguage: str
    animationLanguage: str
    cameraLanguage: str

class Composition(StrictModel):
    shotSize: str
    cameraAngle: str
    framing: str
    focalCharacterIds: list[str]
    supportingCharacterIds: list[str]
    environment: str | None

class CharacterConstraint(StrictModel):
    characterId: str
    name: str
    visualConcept: str
    visualDescription: str
    costumeRequirements: list[str]
    continuityConstraints: list[str]
    performanceBibleVersion: int | None
    referenceAssetIds: list[str]

class Performance(StrictModel):
    characterPerformanceContexts: list[dict[str, Any]]

class Environment(StrictModel):
    locationId: str | None
    description: str | None
    visualTags: list[str]
    continuityRequirements: list[str]

class ProductionFrameSpec(StrictModel):
    id: str
    seriesId: str
    sceneId: str
    scriptId: str
    visualPlanId: str
    storyboardId: str
    storyboardPanelId: str
    model: ModelSpec
    output: OutputSpec
    creativeDirection: CreativeDirection
    composition: Composition
    characters: list[CharacterConstraint]
    performance: Performance
    abilityConstraints: list[dict[str, Any]]
    environment: Environment
    canonicalConstraints: list[str]
    variableShotDirection: list[str]
    references: list[ReferenceSpec] = Field(max_length=18)
    seed: int = Field(ge=0, le=2**32 - 1)
    promptVersion: Literal["1.0"]
    promptChecksum: str = Field(pattern=r"^[a-fA-F0-9]{64}$")

class GenerateRequest(StrictModel):
    spec: ProductionFrameSpec
    prompt: str = Field(min_length=1, max_length=50000)

class GenerateResponse(StrictModel):
    imageBase64: str
    mimeType: Literal["image/png"]
    width: int
    height: int
    taskId: str | None = None

class RuntimeReference:
    def __init__(self, spec: ReferenceSpec, content: bytes, mime_type: str, width: int, height: int):
        self.spec = spec
        self.content = content
        self.mime_type = mime_type
        self.width = width
        self.height = height
