import type {ActionBeat,ActionPose,ProductionFramePerformanceContext,AbilityVfxSpec,ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {VisualArchitecture} from "@/lib/visual-models/types";
import type {ProductionReferenceStatus,ReferenceProvenance,CharacterReferenceRole} from "@/lib/production-references/types";

export type ProductionReferenceType="CHARACTER"|"STYLE"|"LOCATION"|"POSE"|"DEPTH"|"LINEART"|"ABILITY"|"PROP";
export type ProductionReferenceSource="OWNED"|"COMMISSIONED"|"LICENSED"|"OPT_IN"|"PUBLIC_DOMAIN"|"SYNTHETIC";
export type ProductionReferenceAsset={
 id:string;type:ProductionReferenceType;assetUrl:string;checksum:string;source:ProductionReferenceSource;
 approved:boolean;benchmarkOnly:boolean;creatorApproved:boolean;characterId:string|null;abilityId:string|null;
 modelCompatibility:string[];
 status?:ProductionReferenceStatus;storagePath?:string;referenceRole?:CharacterReferenceRole|null;abilitySlot?:ReferenceSheetSlot|null;
 locationId?:string|null;propId?:string|null;provenance?:ReferenceProvenance;
};

export type ProductionCharacterConstraint={
 characterId:string;name:string;visualConcept:string;visualDescription:string;costumeRequirements:string[];
 continuityConstraints:string[];performanceBibleVersion:number|null;referenceAssetIds:string[];
};
export type ProductionAbilityConstraint={
 characterId:string;abilityId:string;abilityName:string;variantId:string;activationPose:ActionPose;
 relevantActionBeats:ActionBeat[];
 visualSignature:{palette:string[];energyShape:string;motionLanguage:string[];vfxMotifs:string[];impactLanguage:string;aftermathLanguage:string};
 vfx:AbilityVfxSpec;cameraLanguage:{preferredShots:string[];preferredAngles:string[];heroMoment:string|null;avoid:string[]};
 mustNotDo:string[];referenceAssetIds:string[];
};
export type ProductionFrameGenerationSpec={
 id:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;storyboardId:string;storyboardPanelId:string;
 model:{modelId:string;revision:string;architecture:VisualArchitecture;developmentOverride:boolean};
 output:{width:number;height:number;aspectRatio:string};
 creativeDirection:{visualStyleDescription:string;colorLanguage:string;lightingLanguage:string;animationLanguage:string;cameraLanguage:string};
 composition:{shotSize:string;cameraAngle:string;framing:string;focalCharacterIds:string[];supportingCharacterIds:string[];environment:string|null};
 characters:ProductionCharacterConstraint[];performance:{characterPerformanceContexts:ProductionFramePerformanceContext[]};abilityConstraints:ProductionAbilityConstraint[];
 environment:{locationId:string|null;description:string|null;visualTags:string[];continuityRequirements:string[]};
 canonicalConstraints:string[];variableShotDirection:string[];references:ProductionReferenceAsset[];
 seed:number;promptVersion:"1.0";promptChecksum:string;
};
export type CompiledProductionFramePrompt={prompt:string;promptVersion:"1.0";promptChecksum:string};
export type ProductionFrameStatus="DRAFT"|"GENERATING"|"READY"|"FAILED"|"ARCHIVED";
export type ProductionFrameGenerationStatus="PENDING"|"GENERATING"|"COMPLETED"|"FAILED"|"SUPERSEDED";
export type GeneratedProductionFrame={bytes:Uint8Array;mimeType:string;width:number;height:number;providerTaskId?:string|null};
export type ProductionFrameRecord={
 id:string;creatorId:string;storyboardPanelId:string;version:number;status:ProductionFrameStatus;selectedGenerationId:string|null;developmentVisual:boolean;modelId:string;modelRevision:string;
 generation:{id:string;status:ProductionFrameGenerationStatus;outputUrl:string|null;width:number|null;height:number|null;mimeType:string|null;errorCode:string|null;retryCount:number}|null;
};
