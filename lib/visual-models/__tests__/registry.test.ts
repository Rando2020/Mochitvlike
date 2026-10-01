import {describe,expect,it} from "vitest";
import {VisualModelRegistry,VISUAL_FOUNDATION_MODELS} from "../registry";
import {assertProductionStatus,isTrainingEligible} from "../licenses";
import type {TrainingAsset,VisualFoundationModel} from "../types";

describe("VisualModelRegistry",()=>{
 it("requires a pinned revision",()=>{const x=structuredClone(VISUAL_FOUNDATION_MODELS[0]) as VisualFoundationModel;x.source.revision="";expect(()=>new VisualModelRegistry([x])).toThrow("MODEL_REVISION_REQUIRED");});
 it("preserves license metadata",()=>expect(new VisualModelRegistry().get("animagine-xl-4.0")?.license.identifier).toBe("openrail++"));
 it("cannot approve review-required commercial license",()=>{const x=structuredClone(VISUAL_FOUNDATION_MODELS[0]) as VisualFoundationModel;x.productionStatus="APPROVED";expect(()=>assertProductionStatus(x)).toThrow("MODEL_NOT_ELIGIBLE_FOR_APPROVAL");});
 it("cannot approve model without artifact checksum",()=>{const x=structuredClone(VISUAL_FOUNDATION_MODELS[2]) as VisualFoundationModel;x.productionStatus="APPROVED";expect(()=>assertProductionStatus(x)).toThrow("MODEL_NOT_ELIGIBLE_FOR_APPROVAL");});
 it("rejects duplicate model id",()=>expect(()=>new VisualModelRegistry([VISUAL_FOUNDATION_MODELS[0],VISUAL_FOUNDATION_MODELS[0]])).toThrow("DUPLICATE_MODEL_ID"));
 it("contains SDXL candidates",()=>expect(new VisualModelRegistry().list().filter(x=>x.architecture==="SDXL").length).toBeGreaterThanOrEqual(2));
 it("records LoRA capability",()=>expect(new VisualModelRegistry().list().every(x=>x.capabilities.lora)).toBe(true));
 it("records IP-Adapter capability",()=>expect(new VisualModelRegistry().list().every(x=>x.capabilities.ipAdapter)).toBe(true));
 it("records ControlNet capability",()=>expect(new VisualModelRegistry().list().every(x=>x.capabilities.controlNet)).toBe(true));
 it("does not approve any unbenchmarked model",()=>expect(new VisualModelRegistry().approved()).toHaveLength(0));
 it("production registry rejects Civitai as source",()=>{const x={...structuredClone(VISUAL_FOUNDATION_MODELS[0]),source:{...VISUAL_FOUNDATION_MODELS[0].source,provider:"CIVITAI"}} as any;expect(()=>new VisualModelRegistry([x])).toThrow("UNAPPROVED_MODEL_SOURCE");});
});

function asset(overrides:Partial<TrainingAsset>={}):TrainingAsset{
 return{id:"asset",source:"OPT_IN",licenseId:"license",permissions:{training:true,commercial:true,redistribution:false},creatorId:"creator",creatorOptIn:true,checksum:"abc",metadata:{characterIds:[],seriesId:"series",shotType:null,cameraAngle:null,poseTags:[],styleTags:[],lightingTags:[],emotionTags:[]},...overrides};
}
describe("Training provenance",()=>{
 it("supports required training source enum",()=>expect(["OWNED","COMMISSIONED","LICENSED","OPT_IN","PUBLIC_DOMAIN","SYNTHETIC"]).toContain(asset().source));
 it("requires training permission",()=>expect(isTrainingEligible(asset({permissions:{training:false,commercial:true,redistribution:false}}))).toBe(false));
 it("requires commercial permission",()=>expect(isTrainingEligible(asset({permissions:{training:true,commercial:false,redistribution:false}}))).toBe(false));
 it("excludes non-opt-in creator material",()=>expect(isTrainingEligible(asset({creatorOptIn:false}))).toBe(false));
 it("allows explicit opt-in creator material",()=>expect(isTrainingEligible(asset())).toBe(true));
 it("allows synthetic commercial training asset",()=>expect(isTrainingEligible(asset({source:"SYNTHETIC",creatorId:null,creatorOptIn:false}))).toBe(true));
});
