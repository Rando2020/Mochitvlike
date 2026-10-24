import {describe,expect,it} from "vitest";
import {getCharacterProductionReadiness,type CharacterBindingReadiness} from "../readiness";
import type {ProductionReferenceRecord} from "../types";

const ref={
  id:"11111111-1111-4111-8111-111111111111",
  seriesId:"70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892",
  type:"CHARACTER",characterId:"char_veya",referenceRole:"FULL_BODY",
  status:"APPROVED",approved:true,creatorApproved:true,benchmarkOnly:false,
  checksum:"a".repeat(64),version:2,archivedAt:null,
  provenance:{
    source:"SYNTHETIC",creatorNameOrId:"creator",licenseIdOrDescription:"creator rights attested",
    sourceUrlOrRecord:null,projectSpecific:true,
    permissions:{productionUse:true,commercialUse:true,modelConditioning:true,redistribution:false},notes:null
  }
} as ProductionReferenceRecord;
const binding:CharacterBindingReadiness={
  bindingRequired:true,
  binding:{referenceId:ref.id,referenceChecksum:ref.checksum,referenceVersion:ref.version,sourceRole:"FULL_BODY"}
};

describe("production reference readiness follows exact approved identity bindings",()=>{
  it("recognizes a full-body source attested to the current visual revision",()=>{
    expect(getCharacterProductionReadiness("char_veya",[ref],binding)).toBe("READY");
  });
  it("recognizes a turnaround source attested to the current visual revision",()=>{
    const turn={...ref,referenceRole:"TURNAROUND"} as ProductionReferenceRecord;
    expect(getCharacterProductionReadiness("char_veya",[turn],{
      bindingRequired:true,binding:{...binding.binding!,sourceRole:"TURNAROUND"}
    })).toBe("READY");
  });
  it("does not claim ready for a stale, mismatched or absent binding",()=>{
    const mismatch=[{referenceChecksum:"b".repeat(64)},{referenceVersion:1},{referenceId:"22222222-2222-4222-8222-222222222222"},{sourceRole:"PRIMARY_IDENTITY" as const}];
    for(const change of mismatch){
      expect(getCharacterProductionReadiness("char_veya",[ref],{
        bindingRequired:true,binding:{...binding.binding!,...change}
      })).toBe("REFERENCE_REVIEW_REQUIRED");
    }
    expect(getCharacterProductionReadiness("char_veya",[ref],{bindingRequired:true,binding:null})).toBe("REFERENCE_REVIEW_REQUIRED");
  });
  it("revoked, archived and benchmark-only records cannot be promoted by a binding",()=>{
    for(const patch of [
      {status:"ARCHIVED",approved:false,archivedAt:"2026-10-23T10:00:00Z"},
      {status:"REJECTED",approved:false},
      {creatorApproved:false},
      {benchmarkOnly:true},
      {provenance:{...ref.provenance,permissions:{...ref.provenance.permissions,modelConditioning:false}}}
    ]){
      expect(getCharacterProductionReadiness("char_veya",[{...ref,...patch} as ProductionReferenceRecord],binding)).not.toBe("READY");
    }
  });
  it("preserves primary-identity compatibility without binding history, but not with stale required binding",()=>{
    const primary={...ref,referenceRole:"PRIMARY_IDENTITY"} as ProductionReferenceRecord;
    expect(getCharacterProductionReadiness("char_veya",[primary])).toBe("READY");
    expect(getCharacterProductionReadiness("char_veya",[primary],{bindingRequired:true,binding:null})).toBe("REFERENCE_REVIEW_REQUIRED");
  });
  it("shows pending full body references as review required instead of missing",()=>{
    expect(getCharacterProductionReadiness("char_veya",[{...ref,status:"REVIEW_REQUIRED",approved:false,creatorApproved:false} as ProductionReferenceRecord])).toBe("REFERENCE_REVIEW_REQUIRED");
    expect(getCharacterProductionReadiness("char_veya",[])).toBe("MISSING_PRIMARY_CHARACTER_REFERENCE");
  });
});
