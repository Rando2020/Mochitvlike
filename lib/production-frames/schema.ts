import {z} from "zod";

const text=z.string().trim().min(1).max(5000);
const id=z.string().trim().min(1).max(200);
const provenance=z.object({
 source:z.enum(["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]),
 creatorNameOrId:text.nullable(),licenseIdOrDescription:text.nullable(),sourceUrlOrRecord:text.nullable(),
 permissions:z.object({productionUse:z.boolean().nullable(),commercialUse:z.boolean().nullable(),modelConditioning:z.boolean().nullable(),redistribution:z.boolean().nullable()}).strict(),
 projectSpecific:z.boolean().nullable(),notes:text.nullable()
}).strict();
const ref=z.object({
 id:id,type:z.enum(["CHARACTER","STYLE","LOCATION","POSE","DEPTH","LINEART","ABILITY","PROP"]),assetUrl:text,checksum:z.string().regex(/^[a-f0-9]{64}$/i),
 source:z.enum(["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]),approved:z.boolean(),benchmarkOnly:z.boolean(),creatorApproved:z.boolean(),
 characterId:id.nullable(),abilityId:id.nullable(),modelCompatibility:z.array(id),
 status:z.enum(["UPLOADED","REVIEW_REQUIRED","APPROVED","REJECTED","ARCHIVED"]).optional(),storagePath:text.optional(),
 referenceRole:z.enum(["PRIMARY_IDENTITY","PROFILE","FULL_BODY","COSTUME","EXPRESSION","TURNAROUND","OTHER"]).nullable().optional(),
 abilitySlot:z.enum(["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"]).nullable().optional(),
 locationId:id.nullable().optional(),propId:id.nullable().optional(),provenance:provenance.optional()
}).strict();

export const ProductionFrameGenerationSpecSchema=z.object({
 id:z.string().uuid(),seriesId:z.string().uuid(),sceneId:z.string().uuid(),scriptId:z.string().uuid(),visualPlanId:z.string().uuid(),storyboardId:z.string().uuid(),storyboardPanelId:z.string().uuid(),
 model:z.object({modelId:id,revision:id,architecture:z.enum(["SDXL","SD3","FLUX","OTHER"]),developmentOverride:z.boolean()}).strict(),
 output:z.object({width:z.number().int().positive(),height:z.number().int().positive(),aspectRatio:id}).strict(),
 creativeDirection:z.object({visualStyleDescription:text,colorLanguage:text,lightingLanguage:text,animationLanguage:text,cameraLanguage:text}).strict(),
 composition:z.object({shotSize:id,cameraAngle:text,framing:text,focalCharacterIds:z.array(id),supportingCharacterIds:z.array(id),environment:text.nullable()}).strict(),
 characters:z.array(z.object({characterId:id,name:text,visualConcept:text,visualDescription:text,costumeRequirements:z.array(text),continuityConstraints:z.array(text),performanceBibleVersion:z.number().int().positive().nullable(),referenceAssetIds:z.array(id)}).strict()),
 performance:z.object({characterPerformanceContexts:z.array(z.any())}).strict(),abilityConstraints:z.array(z.any()),
 environment:z.object({locationId:id.nullable(),description:text.nullable(),visualTags:z.array(text),continuityRequirements:z.array(text)}).strict(),
 canonicalConstraints:z.array(text).min(1),variableShotDirection:z.array(text).min(1),references:z.array(ref),
 seed:z.number().int().nonnegative(),promptVersion:z.literal("1.0"),promptChecksum:z.string().regex(/^[a-f0-9]{64}$/i)
}).strict();
