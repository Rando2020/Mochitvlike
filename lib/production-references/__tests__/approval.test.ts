import {describe,expect,it} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildOrinPerformanceBible} from "@/lib/character-performance/__tests__/fixtures";
import {approvalProblems,isApprovedProductionReference,provenanceProblems,requiredAbilitySlots,validateReferenceAssociation} from "../validation";
import {getAbilityProductionReadiness,getCharacterProductionReadiness} from "../readiness";
import type {ProductionReferenceRecord,ReferenceProvenance} from "../types";

const bible=buildOrinPerformanceBible(),ability=bible.abilityKit[0],seriesId="22222222-2222-4222-8222-222222222222";
const provenance=(source:ReferenceProvenance["source"]="OWNED",overrides:Partial<ReferenceProvenance>={}):ReferenceProvenance=>({source,creatorNameOrId:"creator",licenseIdOrDescription:"owned rights",sourceUrlOrRecord:null,permissions:{productionUse:true,commercialUse:true,modelConditioning:true,redistribution:false},projectSpecific:source==="SYNTHETIC"?true:null,notes:null,...overrides});
const record=(overrides:Partial<ProductionReferenceRecord>={}):ProductionReferenceRecord=>({id:"11111111-1111-4111-8111-111111111111",seriesId,type:"CHARACTER",status:"APPROVED",source:"OWNED",storagePath:"users/u/x.png",assetUrl:"storage://x",checksum:"a".repeat(64),benchmarkOnly:false,creatorApproved:true,approved:true,characterId:"char_orin",abilityId:null,locationId:null,propId:null,referenceRole:"PRIMARY_IDENTITY",abilitySlot:null,modelCompatibility:[],provenance:provenance(),visualMetadata:{width:100,height:100,mimeType:"image/png",notes:null},version:1,replacesReferenceId:null,createdAt:"2026-10-01",updatedAt:"2026-10-01",archivedAt:null,...overrides});

describe("provenance rights",()=>{
 for(const source of ["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"] as const)it("accepts complete "+source,()=>expect(provenanceProblems(provenance(source))).toEqual([]));
 it("requires creator record",()=>expect(provenanceProblems(provenance("OWNED",{creatorNameOrId:null}))).toContain("CREATOR_RECORD_REQUIRED"));
 it("requires rights record",()=>expect(provenanceProblems(provenance("OWNED",{licenseIdOrDescription:null,sourceUrlOrRecord:null}))).toContain("RIGHTS_RECORD_REQUIRED"));
 it("requires production use",()=>expect(provenanceProblems(provenance("OWNED",{permissions:{productionUse:false,commercialUse:true,modelConditioning:true,redistribution:false}}))).toContain("PRODUCTION_USE_PERMISSION_REQUIRED"));
 it("requires commercial use",()=>expect(provenanceProblems(provenance("OWNED",{permissions:{productionUse:true,commercialUse:null,modelConditioning:true,redistribution:false}}))).toContain("COMMERCIAL_USE_PERMISSION_REQUIRED"));
 it("requires conditioning use",()=>expect(provenanceProblems(provenance("OWNED",{permissions:{productionUse:true,commercialUse:true,modelConditioning:false,redistribution:false}}))).toContain("MODEL_CONDITIONING_PERMISSION_REQUIRED"));
 it("does not require redistribution",()=>expect(provenanceProblems(provenance("OWNED",{permissions:{productionUse:true,commercialUse:true,modelConditioning:true,redistribution:false}}))).toEqual([]));
 it("requires synthetic project specificity",()=>expect(provenanceProblems(provenance("SYNTHETIC",{projectSpecific:false}))).toContain("SYNTHETIC_PROJECT_SPECIFIC_REQUIRED"));
});

describe("association validation",()=>{
 it("accepts character association",()=>expect(validateReferenceAssociation(record(),theWoundsWeKeep,[bible])).toEqual([]));
 it("rejects unknown character",()=>expect(validateReferenceAssociation(record({characterId:"missing"}),theWoundsWeKeep,[bible])).toContain("INVALID_CHARACTER_ASSOCIATION"));
 it("requires character role",()=>expect(validateReferenceAssociation(record({referenceRole:null}),theWoundsWeKeep,[bible])).toContain("CHARACTER_REFERENCE_ROLE_REQUIRED"));
 it("rejects character association on STYLE",()=>expect(validateReferenceAssociation(record({type:"STYLE",characterId:"char_orin",referenceRole:null}),theWoundsWeKeep,[bible])).toContain("CHARACTER_ASSOCIATION_TYPE_MISMATCH"));
 it("accepts location association",()=>expect(validateReferenceAssociation(record({type:"LOCATION",characterId:null,referenceRole:null,locationId:"location_border_town"}),theWoundsWeKeep,[bible])).toEqual([]));
 it("rejects invalid location",()=>expect(validateReferenceAssociation(record({type:"LOCATION",characterId:null,referenceRole:null,locationId:"missing"}),theWoundsWeKeep,[bible])).toContain("INVALID_LOCATION_ASSOCIATION"));
 it("requires prop scope",()=>expect(validateReferenceAssociation(record({type:"PROP",characterId:null,referenceRole:null,propId:null}),theWoundsWeKeep,[bible])).toContain("PROP_SCOPE_REQUIRED"));
 for(const slot of ["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"] as const)it("accepts ability slot "+slot,()=>expect(validateReferenceAssociation(record({type:"ABILITY",characterId:"char_orin",referenceRole:null,abilityId:ability.id,abilitySlot:slot}),theWoundsWeKeep,[bible])).toEqual([]));
 it("rejects wrong ability",()=>expect(validateReferenceAssociation(record({type:"ABILITY",characterId:"char_orin",referenceRole:null,abilityId:"missing",abilitySlot:"ACTIVATION_POSE"}),theWoundsWeKeep,[bible])).toContain("INVALID_ABILITY_ASSOCIATION"));
 it("rejects ability wrong character",()=>expect(validateReferenceAssociation(record({type:"ABILITY",characterId:"char_mara",referenceRole:null,abilityId:ability.id,abilitySlot:"ACTIVATION_POSE"}),theWoundsWeKeep,[bible])).toContain("INVALID_ABILITY_ASSOCIATION"));
});

describe("approval lifecycle semantics",()=>{
 it("complete reference has no approval problems",()=>expect(approvalProblems(record(),theWoundsWeKeep,[bible])).toEqual([]));
 it("benchmark cannot approve",()=>expect(approvalProblems(record({benchmarkOnly:true}),theWoundsWeKeep,[bible])).toContain("BENCHMARK_REFERENCE_FORBIDDEN"));
 it("technical validity required",()=>expect(approvalProblems(record({storagePath:""}),theWoundsWeKeep,[bible])).toContain("REFERENCE_TECHNICAL_VALIDITY_REQUIRED"));
 it("pending is not approved",()=>expect(isApprovedProductionReference(record({status:"REVIEW_REQUIRED",approved:false,creatorApproved:false}))).toBe(false));
 it("rejected is not approved",()=>expect(isApprovedProductionReference(record({status:"REJECTED",approved:false,creatorApproved:false}))).toBe(false));
 it("archived is not approved",()=>expect(isApprovedProductionReference(record({status:"ARCHIVED",approved:false}))).toBe(false));
 it("benchmark is not approved",()=>expect(isApprovedProductionReference(record({benchmarkOnly:true}))).toBe(false));
 it("approved complete is approved",()=>expect(isApprovedProductionReference(record())).toBe(true));
});

describe("production readiness",()=>{
 it("character missing primary",()=>expect(getCharacterProductionReadiness("char_mara",[])).toBe("MISSING_PRIMARY_CHARACTER_REFERENCE"));
 it("character pending",()=>expect(getCharacterProductionReadiness("char_orin",[record({status:"REVIEW_REQUIRED",approved:false,creatorApproved:false})])).toBe("REFERENCE_REVIEW_REQUIRED"));
 it("character ready",()=>expect(getCharacterProductionReadiness("char_orin",[record()])).toBe("READY"));
 it("profile alone does not satisfy primary",()=>expect(getCharacterProductionReadiness("char_orin",[record({referenceRole:"PROFILE"})])).toBe("MISSING_PRIMARY_CHARACTER_REFERENCE"));
 it("ability requires nine canonical slots",()=>expect(requiredAbilitySlots(bible,ability.id)).toHaveLength(9));
 it("ability missing",()=>expect(getAbilityProductionReadiness("char_orin",ability.id,bible,[])).toBe("MISSING_ABILITY_REFERENCE"));
 it("ability pending",()=>expect(getAbilityProductionReadiness("char_orin",ability.id,bible,[record({type:"ABILITY",referenceRole:null,abilityId:ability.id,abilitySlot:"ACTIVATION_POSE",status:"REVIEW_REQUIRED",approved:false,creatorApproved:false})])).toBe("REFERENCE_REVIEW_REQUIRED"));
 it("ability not ready with four bootstrap refs",()=>{const slots=["ACTIVATION_POSE","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE"] as const;const refs=slots.map((slot,i)=>record({id:String(i),type:"ABILITY",referenceRole:null,abilityId:ability.id,abilitySlot:slot}));expect(getAbilityProductionReadiness("char_orin",ability.id,bible,refs)).toBe("MISSING_ABILITY_REFERENCE");});
 it("ability ready with all approved slots",()=>{const refs=requiredAbilitySlots(bible,ability.id).map((slot,i)=>record({id:String(i),type:"ABILITY",referenceRole:null,abilityId:ability.id,abilitySlot:slot}));expect(getAbilityProductionReadiness("char_orin",ability.id,bible,refs)).toBe("READY");});
 it("pending slot does not count",()=>{const refs=requiredAbilitySlots(bible,ability.id).map((slot,i)=>record({id:String(i),type:"ABILITY",referenceRole:null,abilityId:ability.id,abilitySlot:slot,...(i===0?{status:"REVIEW_REQUIRED" as const,approved:false,creatorApproved:false}:{})}));expect(getAbilityProductionReadiness("char_orin",ability.id,bible,refs)).toBe("REFERENCE_REVIEW_REQUIRED");});
});
