import {describe,expect,it} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "@/lib/storyboards/compileStoryboardBlueprint";
import {buildOrinPerformanceBible} from "@/lib/character-performance/__tests__/fixtures";
import {VISUAL_FOUNDATION_MODELS,VisualModelRegistry} from "@/lib/visual-models/registry";
import {buildProductionFrameGenerationSpec} from "../compiler";
import {compileProductionFramePrompt,productionFrameSpecChecksum} from "../prompt";
import {selectVisualProductionModel,VisualModelSelectionError} from "../modelSelector";
import {assertProductionReference,ProductionReferenceError} from "../references";
import type {ProductionReferenceAsset} from "../types";

const base={storyboardId:"66666666-6666-4666-8666-666666666666",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:"11111111-1111-4111-8111-111111111111",scriptId:"33333333-3333-4333-8333-333333333333",visualPlanId:"55555555-5555-4555-8555-555555555555",version:1,series:theWoundsWeKeep,scene:buildValidScene(),script:buildValidScript(),visualPlan:buildValidVisualPlan()};
const storyboard=compileStoryboardBlueprint(base).blueprint;
const panel=storyboard.panels[3];
const bible=buildOrinPerformanceBible();
const ability=bible.abilityKit[0];
const model=VISUAL_FOUNDATION_MODELS[0];
const ref=(id:string,type:ProductionReferenceAsset["type"],characterId:string|null,abilityId:string|null,abilitySlot?:ProductionReferenceAsset["abilitySlot"]):ProductionReferenceAsset=>({id,type,assetUrl:"https://example.com/"+id+".png",checksum:"a".repeat(64),source:"OWNED",approved:true,benchmarkOnly:false,creatorApproved:true,characterId,abilityId,modelCompatibility:[model.id],...(abilitySlot?{abilitySlot}:{})});
const abilityRefs=ability.referenceSheet.map((slot,i)=>ref("ref-ability-"+i,"ABILITY","char_orin",ability.id,slot.slot));
const references=[ref("ref-orin","CHARACTER","char_orin",null),ref("ref-mara","CHARACTER","char_mara",null),...abilityRefs];
function spec(overrides:Record<string,unknown>={}){
 return buildProductionFrameGenerationSpec({series:theWoundsWeKeep,scene:base.scene,script:base.script,visualPlan:base.visualPlan,storyboard,panel,model,developmentOverride:true,references,performanceBibles:[bible],performanceBindings:[{characterId:"char_orin",abilityId:ability.id}],canonContext:{episodeNumber:1,activeCanonFactIds:["fact_transfer","fact_banned"]},...overrides} as Parameters<typeof buildProductionFrameGenerationSpec>[0]);
}

describe("ProductionFrameGenerationSpec",()=>{
 it("is deterministic",()=>expect(spec()).toEqual(spec()));
 it("consumes Series",()=>expect(spec().creativeDirection.visualStyleDescription).toBe(theWoundsWeKeep.creativeDNA.visualStyle.description));
 it("consumes Scene",()=>expect(spec().sceneId).toBe(base.scene.id));
 it("consumes Script",()=>expect(spec().scriptId).toBe(base.script.id));
 it("consumes VisualPlan",()=>expect(spec().visualPlanId).toBe(base.visualPlan.id));
 it("consumes Storyboard",()=>expect(spec().storyboardId).toBe(storyboard.id));
 it("consumes panel",()=>expect(spec().storyboardPanelId).toBe(panel.id));
 it("preserves visual DNA",()=>expect(spec().creativeDirection.colorLanguage).toBe(theWoundsWeKeep.creativeDNA.visualStyle.colorLanguage));
 it("preserves animation language",()=>expect(spec().creativeDirection.animationLanguage).toBe(theWoundsWeKeep.creativeDNA.visualStyle.animationLanguage));
 it("preserves camera language",()=>expect(spec().creativeDirection.cameraLanguage).toBe(theWoundsWeKeep.creativeDNA.visualStyle.cameraLanguage));
 it("contains Orin identity",()=>expect(spec().characters.find(c=>c.characterId==="char_orin")?.name).toBe("Orin"));
 it("contains visualConcept",()=>expect(spec().characters.find(c=>c.characterId==="char_orin")?.visualConcept).toContain("field medic"));
 it("contains visualDescription",()=>expect(spec().characters.find(c=>c.characterId==="char_orin")?.visualDescription).toContain("wrapped hands"));
 it("contains costume continuity",()=>expect(spec().characters.find(c=>c.characterId==="char_orin")?.costumeRequirements).toContain("Wrapped hands"));
 it("contains Performance Bible version",()=>expect(spec().characters.find(c=>c.characterId==="char_orin")?.performanceBibleVersion).toBe(1));
 it("contains performance context",()=>expect(spec().performance.characterPerformanceContexts[0].characterId).toBe("char_orin"));
 it("detects explicit canonical ability binding",()=>expect(spec().abilityConstraints[0].abilityName).toBe("Burden Draw"));
 it("selects historical v1 variant",()=>expect(spec().abilityConstraints[0].variantId).toBe(ability.variants[0].id));
 it("contains AbilityVfxSpec",()=>expect(spec().abilityConstraints[0].vfx.energyShape).toContain("compressed organic rings"));
 it("keeps canonical constraints",()=>expect(spec().canonicalConstraints.length).toBeGreaterThan(8));
 it("keeps shot direction separate",()=>expect(spec().variableShotDirection.length).toBeGreaterThan(4));
 it("uses deterministic seed",()=>expect(spec().seed).toBe(spec().seed));
 it("uses deterministic frame id",()=>expect(spec().id).toBe(spec().id));
 it("pins model id",()=>expect(spec().model.modelId).toBe(model.id));
 it("pins model revision",()=>expect(spec().model.revision).toBe(model.source.revision));
 it("marks development override",()=>expect(spec().model.developmentOverride).toBe(true));
 it("includes approved character refs",()=>expect(spec().references.filter(r=>r.type==="CHARACTER")).toHaveLength(2));
 it("includes approved ability ref",()=>expect(spec().references.some(r=>r.type==="ABILITY")).toBe(true));
 it("does not mutate Series",()=>{const before=structuredClone(theWoundsWeKeep);spec();expect(theWoundsWeKeep).toEqual(before);});
 it("does not mutate Scene",()=>{const before=structuredClone(base.scene);spec();expect(base.scene).toEqual(before);});
 it("does not mutate Script",()=>{const before=structuredClone(base.script);spec();expect(base.script).toEqual(before);});
 it("does not mutate VisualPlan",()=>{const before=structuredClone(base.visualPlan);spec();expect(base.visualPlan).toEqual(before);});
 it("does not mutate Storyboard",()=>{const before=structuredClone(storyboard);spec();expect(storyboard).toEqual(before);});
 it("preserves protected canon",()=>expect(spec().canonicalConstraints.some(x=>x.includes("fact_transfer"))).toBe(true));
 it("preserves protected mysteries",()=>expect(spec().canonicalConstraints.some(x=>x.includes("mystery_creatures"))).toBe(true));
 it("uses expected default dimensions",()=>expect(spec().output).toMatchObject({width:1536,height:1024}));
 it("allows bounded output override",()=>expect(spec({output:{width:1024,height:1024}}).output.width).toBe(1024));
});

describe("Burden Draw regression",()=>{
 it("preserves physical contact",()=>expect(JSON.stringify(spec().abilityConstraints[0])).toContain("contact"));
 it("preserves wrapped palm",()=>expect(JSON.stringify(spec().abilityConstraints[0])).toContain("wrapped"));
 it("preserves free hand near sternum",()=>expect(JSON.stringify(spec().abilityConstraints[0])).toContain("sternum"));
 it("preserves patient to Orin direction",()=>expect(spec().abilityConstraints[0].vfx.travelBehavior).toContain("toward Orin"));
 it("preserves compressed rings",()=>expect(spec().abilityConstraints[0].visualSignature.energyShape).toContain("compressed organic rings"));
 it("preserves wound-crimson",()=>expect(spec().abilityConstraints[0].visualSignature.palette.join(" ")).toContain("wound-crimson"));
 it("preserves violet",()=>expect(spec().abilityConstraints[0].visualSignature.palette.join(" ")).toContain("violet"));
 it("preserves pale-white",()=>expect(spec().abilityConstraints[0].visualSignature.palette.join(" ")).toContain("pale-white"));
 it("preserves inward particles",()=>expect(spec().abilityConstraints[0].vfx.particleMotifs.join(" ")).toContain("inward"));
 it("preserves contained recoil",()=>expect(spec().abilityConstraints[0].vfx.impactBehavior).toContain("recoil"));
 it("preserves subdermal aftermath",()=>expect(spec().abilityConstraints[0].vfx.aftermathBehavior).toContain("subdermal"));
 it("prompt forbids ranged projectile",()=>expect(compileProductionFramePrompt(spec()).prompt).toContain("ranged projectile"));
 it("prompt forbids generic lightning",()=>expect(compileProductionFramePrompt(spec()).prompt).toContain("generic lightning"));
 it("prompt forbids outward explosion",()=>expect(compileProductionFramePrompt(spec()).prompt).toContain("outward explosion"));
 for(const [title,shot] of [["front angle","front three-quarter"],["side angle","strict profile"],["wide shot","wide environmental"],["different lighting","cool moonlight"],["Mara present","Mara remains in frame"]] as const){
  it("supports "+title,()=>{const s=spec();s.variableShotDirection=[...s.variableShotDirection,shot];const prompt=compileProductionFramePrompt(s).prompt;expect(prompt).toContain(shot);expect(prompt).toContain("Burden Draw");});
 }
});

describe("prompt and provenance",()=>{
 it("prompt is deterministic",()=>expect(compileProductionFramePrompt(spec())).toEqual(compileProductionFramePrompt(spec())));
 it("prompt has canonical header",()=>expect(compileProductionFramePrompt(spec()).prompt).toContain("CANONICAL PRODUCTION CONSTRAINTS"));
 it("prompt has shot header",()=>expect(compileProductionFramePrompt(spec()).prompt).toContain("SHOT DIRECTION"));
 it("prompt checksum is 64 hex",()=>expect(compileProductionFramePrompt(spec()).promptChecksum).toMatch(/^[a-f0-9]{64}$/));
 it("spec checksum is deterministic",()=>expect(productionFrameSpecChecksum(spec())).toBe(productionFrameSpecChecksum(spec())));
 it("spec checksum is 64 hex",()=>expect(productionFrameSpecChecksum(spec())).toMatch(/^[a-f0-9]{64}$/));
 it("approved reference passes",()=>expect(assertProductionReference(references[0],model.id).approved).toBe(true));
 it("benchmark-only reference is rejected",()=>{expect(()=>assertProductionReference({...references[0],benchmarkOnly:true,approved:false},model.id)).toThrowError(ProductionReferenceError);});
 it("unapproved reference is rejected",()=>{expect(()=>assertProductionReference({...references[0],approved:false},model.id)).toThrowError(ProductionReferenceError);});
 it("model-incompatible reference is rejected",()=>{expect(()=>assertProductionReference({...references[0],modelCompatibility:["other"]},model.id)).toThrowError(ProductionReferenceError);});
 it("missing character ref is rejected",()=>expect(()=>spec({references:[references[0],abilityRefs[0]]})).toThrow("MISSING_PRODUCTION_REFERENCE"));
 it("missing ability ref is rejected",()=>expect(()=>spec({references:references.slice(0,2)})).toThrow("MISSING_PRODUCTION_REFERENCE"));
});

describe("visual model selection",()=>{
 it("normal registry has no approved model",()=>expect(new VisualModelRegistry().approved()).toHaveLength(0));
 it("throws controlled no-approved-model error",()=>expect(()=>selectVisualProductionModel({nodeEnv:"development",devModelId:null})).toThrowError(VisualModelSelectionError));
 it("allows explicit dev model outside production",()=>expect(selectVisualProductionModel({nodeEnv:"development",devModelId:model.id}).developmentOverride).toBe(true));
 it("dev override uses exact revision",()=>expect(selectVisualProductionModel({nodeEnv:"test",devModelId:model.id}).model.source.revision).toBe(model.source.revision));
 it("rejects dev override in production",()=>expect(()=>selectVisualProductionModel({nodeEnv:"production",devModelId:model.id})).toThrow("Development visual model overrides are disabled"));
 it("does not mutate model approval",()=>{selectVisualProductionModel({nodeEnv:"test",devModelId:model.id});expect(new VisualModelRegistry().get(model.id)?.productionStatus).toBe("CANDIDATE");});
 it("rejects missing dev model",()=>expect(()=>selectVisualProductionModel({nodeEnv:"test",devModelId:"missing"})).toThrow("Development visual model was not found"));
});
