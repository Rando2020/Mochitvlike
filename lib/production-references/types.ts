import type {ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {ProductionReferenceSource,ProductionReferenceType} from "@/lib/production-frames/types";

export type ProductionReferenceStatus="UPLOADED"|"REVIEW_REQUIRED"|"APPROVED"|"REJECTED"|"ARCHIVED";
export type CharacterReferenceRole="PRIMARY_IDENTITY"|"PROFILE"|"FULL_BODY"|"COSTUME"|"EXPRESSION"|"TURNAROUND"|"OTHER";
export type ReferencePermissions={productionUse:boolean|null;commercialUse:boolean|null;modelConditioning:boolean|null;redistribution:boolean|null};
export type ReferenceProvenance={
 source:ProductionReferenceSource;
 creatorNameOrId:string|null;
 licenseIdOrDescription:string|null;
 sourceUrlOrRecord:string|null;
 permissions:ReferencePermissions;
 projectSpecific:boolean|null;
 notes:string|null;
};
export type ProductionReferenceRecord={
 id:string;seriesId:string;type:ProductionReferenceType;status:ProductionReferenceStatus;source:ProductionReferenceSource;
 storagePath:string;assetUrl:string;checksum:string;benchmarkOnly:boolean;creatorApproved:boolean;approved:boolean;
 characterId:string|null;abilityId:string|null;locationId:string|null;propId:string|null;
 referenceRole:CharacterReferenceRole|null;abilitySlot:ReferenceSheetSlot|null;modelCompatibility:string[];
 provenance:ReferenceProvenance;visualMetadata:{width:number;height:number;mimeType:"image/png"|"image/jpeg"|"image/webp";notes:string|null};
 version:number;replacesReferenceId:string|null;createdAt:string;updatedAt:string;archivedAt:string|null;
};
export type CharacterProductionReadiness="READY"|"MISSING_PRIMARY_CHARACTER_REFERENCE"|"REFERENCE_REVIEW_REQUIRED";
export type AbilityProductionReadiness="READY"|"MISSING_ABILITY_REFERENCE"|"REFERENCE_REVIEW_REQUIRED";
