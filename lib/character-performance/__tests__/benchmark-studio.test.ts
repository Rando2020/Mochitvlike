import {describe,expect,it} from "vitest";
import {buildOrinPerformanceBible} from "./fixtures";
import {buildAbilityConsistencyScenarios} from "../benchmark";
import {buildCharacterPerformanceStudioViewModel} from "../studio";

const context={episodeNumber:2,activeCanonFactIds:["fact_transfer"]};
const prohibited=["rasengan","kamehameha","hadouken","domain expansion","bankai"];

describe("Character Performance Studio contract",()=>{
 it("exposes creator-facing tabs",()=>{const v=buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context);expect(v.tabs).toEqual(["Overview","Appearance","Personality","Performance","Abilities"]);});
 it("exposes Movement Identity",()=>{const v=buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context);expect(v.performance.movementIdentity.posture).toBeTruthy();});
 it("exposes Action Guide",()=>{const v=buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context);expect(v.performance.actionGuide.attackVocabulary.length).toBeGreaterThan(0);});
 it("exposes Signature Actions",()=>{const v=buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context);expect(v.performance.signatureActions[0].name).toBe("Three-Knot Field Wrap");});
 it("ability card includes name/classification/concept/palette",()=>{const v=buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context),a=v.abilities[0];expect(a.name).toBe("Burden Draw");expect(a.classification).toBe("SIGNATURE");expect(a.concept).toBeTruthy();expect(a.palette.length).toBeGreaterThan(0);});
 it("ability card shows unlock status",()=>expect(buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context).abilities[0].unlocked).toBe(true));
 it("locked ability card remains visible but marked locked",()=>expect(buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),{episodeNumber:2,activeCanonFactIds:[]}).abilities[0].unlocked).toBe(false));
 it("ability card resolves historical current variant for context",()=>expect(buildCharacterPerformanceStudioViewModel(buildOrinPerformanceBible(),context).abilities[0].currentVariant?.version).toBe(1));
});

describe("Ability consistency benchmark contract",()=>{
 it("creates six canonical ability-consistency scenarios",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id)).toHaveLength(6);});
 it("all scenarios use ABILITY_CONSISTENCY category",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).every(s=>s.category==="ABILITY_CONSISTENCY")).toBe(true);});
 it("scenario IDs are deterministic",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).map(s=>s.id)).toEqual(buildAbilityConsistencyScenarios(b,a.id).map(s=>s.id));});
 it("scenario seeds are deterministic",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).map(s=>s.seed)).toEqual(buildAbilityConsistencyScenarios(b,a.id).map(s=>s.seed));});
 it("front angle scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.title==="Front angle")).toBe(true);});
 it("side angle scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.title==="Side angle")).toBe(true);});
 it("wide shot scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.title==="Wide shot")).toBe(true);});
 it("different lighting scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.title==="Different lighting")).toBe(true);});
 it("alongside another character scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.withCharacterIds.includes("char_mara"))).toBe(true);});
 it("different Episode scenario exists",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(buildAbilityConsistencyScenarios(b,a.id).some(s=>s.title==="Different episode")).toBe(true);});
 it("all scenarios preserve the same historical technique variant",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],s=buildAbilityConsistencyScenarios(b,a.id);expect(new Set(s.map(x=>x.variantId)).size).toBe(1);});
 it("all scenarios preserve canonical ability language",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],s=buildAbilityConsistencyScenarios(b,a.id);expect(s.every(x=>x.promptContract.mustPreserve.includes(a.identity.name)&&x.promptContract.mustPreserve.includes(a.visualSignature.energyShape))).toBe(true);});
 it("all scenarios carry deterministic reference asset keys",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],s=buildAbilityConsistencyScenarios(b,a.id);expect(s.every(x=>x.promptContract.referenceAssetKeys.length===a.referenceSheet.length)).toBe(true);});
});

describe("Original fixture safety",()=>{
 it("uses original technique names only",()=>{const text=JSON.stringify(buildOrinPerformanceBible()).toLowerCase();for(const name of prohibited)expect(text).not.toContain(name);});
 it("does not reference copyrighted franchise names",()=>{const text=JSON.stringify(buildOrinPerformanceBible()).toLowerCase();for(const name of ["naruto","dragon ball","street fighter","bleach","jujutsu kaisen"])expect(text).not.toContain(name);});
});
