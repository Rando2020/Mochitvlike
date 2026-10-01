import {describe,expect,it} from "vitest";
import {buildOrinPerformanceBible} from "./fixtures";
import {getAvailableAbilities,getCanonicalAbilityVariant,getCurrentDeclaredVariant,isAbilityAvailable} from "../canon";
import {materializeAbilityVariant} from "../integration";

describe("Canon-aware ability availability",()=>{
 it("ability unavailable before unlock fact",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(isAbilityAvailable(a,{episodeNumber:1,activeCanonFactIds:[]})).toBe(false);});
 it("ability available after unlock fact",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(isAbilityAvailable(a,{episodeNumber:1,activeCanonFactIds:["fact_transfer"]})).toBe(true);});
 it("getAvailableAbilities excludes locked ability",()=>{const b=buildOrinPerformanceBible();expect(getAvailableAbilities(b,{episodeNumber:1,activeCanonFactIds:[]})).toHaveLength(0);});
 it("getAvailableAbilities includes unlocked ability",()=>{const b=buildOrinPerformanceBible();expect(getAvailableAbilities(b,{episodeNumber:1,activeCanonFactIds:["fact_transfer"]}).map(a=>a.identity.name)).toContain("Burden Draw");});
});

describe("Historical ability variant resolution",()=>{
 it("episode 2 resolves v1",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(getCanonicalAbilityVariant(a,{episodeNumber:2,activeCanonFactIds:["fact_transfer"]})?.version).toBe(1);});
 it("episode 5 still resolves v1",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(getCanonicalAbilityVariant(a,{episodeNumber:5,activeCanonFactIds:["fact_transfer"]})?.version).toBe(1);});
 it("episode 6 resolves v2",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(getCanonicalAbilityVariant(a,{episodeNumber:6,activeCanonFactIds:["fact_transfer"]})?.version).toBe(2);});
 it("later episode resolves v2",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(getCanonicalAbilityVariant(a,{episodeNumber:12,activeCanonFactIds:["fact_transfer"]})?.version).toBe(2);});
 it("archived v1 remains resolvable historically",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];const v=getCanonicalAbilityVariant(a,{episodeNumber:2,activeCanonFactIds:["fact_transfer"]});expect(v?.status).toBe("ARCHIVED");});
 it("declared current variant is v2",()=>{const a=buildOrinPerformanceBible().abilityKit[0];expect(getCurrentDeclaredVariant(a)?.version).toBe(2);});
 it("v2 replaces v1",()=>{const a=buildOrinPerformanceBible().abilityKit[0];expect(a.variants[1].replacesVariantId).toBe(a.variants[0].id);});
 it("v2 preserves ability identity",()=>{const a=buildOrinPerformanceBible().abilityKit[0];expect(a.variants.every(v=>v.abilityId===a.id)).toBe(true);});
 it("v1 materializes base choreography",()=>{const a=buildOrinPerformanceBible().abilityKit[0],v=a.variants[0];expect(materializeAbilityVariant(a,v).choreography.windup).toEqual(a.choreography.windup);});
 it("v2 materializes changed windup",()=>{const a=buildOrinPerformanceBible().abilityKit[0],v=a.variants[1];expect(materializeAbilityVariant(a,v).choreography.windup).toEqual(v.changes.choreography.windup);});
 it("v2 changes motion language without replacing the whole visual signature",()=>{const a=buildOrinPerformanceBible().abilityKit[0],v=a.variants[1],m=materializeAbilityVariant(a,v);expect(m.visualSignature.motionLanguage).toEqual(v.changes.visualSignature.motionLanguage);expect(m.visualSignature.energyShape).toBe(a.visualSignature.energyShape);});
});
