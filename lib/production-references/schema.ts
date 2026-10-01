import {z} from "zod";
const text=z.string().trim().min(1).max(2000);
export const ReferenceProvenanceSchema=z.object({
 source:z.enum(["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]),
 creatorNameOrId:text.nullable(),licenseIdOrDescription:text.nullable(),sourceUrlOrRecord:text.nullable(),
 permissions:z.object({productionUse:z.boolean().nullable(),commercialUse:z.boolean().nullable(),modelConditioning:z.boolean().nullable(),redistribution:z.boolean().nullable()}).strict(),
 projectSpecific:z.boolean().nullable(),notes:text.nullable()
}).strict();
export const ReferenceMetadataSchema=z.object({
 type:z.enum(["CHARACTER","STYLE","LOCATION","POSE","DEPTH","LINEART","ABILITY","PROP"]),
 source:z.enum(["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]),
 characterId:text.nullable().optional(),abilityId:text.nullable().optional(),locationId:text.nullable().optional(),propId:text.nullable().optional(),
 referenceRole:z.enum(["PRIMARY_IDENTITY","PROFILE","FULL_BODY","COSTUME","EXPRESSION","TURNAROUND","OTHER"]).nullable().optional(),
 abilitySlot:z.enum(["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"]).nullable().optional(),
 modelCompatibility:z.array(text).max(20).default([]),provenance:ReferenceProvenanceSchema,notes:text.nullable().optional(),replacesReferenceId:z.string().uuid().nullable().optional(),
 benchmarkOnly:z.boolean().optional().default(false)
}).strict();
