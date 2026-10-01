import {describe,expect,it} from "vitest";
import {buildOrinPerformanceBible} from "./fixtures";
import {buildAbilitySoundIntegration,buildAbilityVfxIntegration,buildMotionChoreographyContext,buildProductionFramePerformanceContext} from "../integration";

const context={episodeNumber:2,activeCanonFactIds:["fact_transfer"]};

describe("Production Frame integration contract",()=>{
 it("builds ability production context",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.name).toBe("Burden Draw");});
 it("uses historical variant for frame context",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.variant.version).toBe(1);});
 it("includes activation pose",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.activation.startPose.handPositions.length).toBeGreaterThan(0);});
 it("includes visual signature",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.visualSignature.energyShape).toMatch(/compressed/i);});
 it("includes VFX contract",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.vfx.emissionAnchors).toContain("Orin contact palm");});
 it("includes ability reference sheet",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],c=buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});expect(c.ability?.referenceSheet.length).toBe(9);});
 it("rejects locked ability",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0];expect(()=>buildProductionFramePerformanceContext({bible:b,context:{episodeNumber:2,activeCanonFactIds:[]},abilityId:a.id})).toThrow("ABILITY_NOT_AVAILABLE");});
 it("builds signature action frame context",()=>{const b=buildOrinPerformanceBible(),s=b.actionGuide.signatureActions[0],c=buildProductionFramePerformanceContext({bible:b,context,signatureActionId:s.id});expect(c.signatureAction?.name).toBe("Three-Knot Field Wrap");});
});

describe("Motion integration contract",()=>{
 it("ability maps to semantic action beats",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],m=buildMotionChoreographyContext({bible:b,context,abilityId:a.id});expect(m.sourceType).toBe("ABILITY");expect(m.beats.length).toBeGreaterThanOrEqual(5);});
 it("ability motion exposes movement vectors",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],m=buildMotionChoreographyContext({bible:b,context,abilityId:a.id});expect(m.movementVectors.length).toBeGreaterThan(0);});
 it("ability motion exposes VFX anchors",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],m=buildMotionChoreographyContext({bible:b,context,abilityId:a.id});expect(m.vfxAnchorHints).toContain("patient injury");});
 it("signature action maps to motion context",()=>{const b=buildOrinPerformanceBible(),s=b.actionGuide.signatureActions[0],m=buildMotionChoreographyContext({bible:b,context,signatureActionId:s.id});expect(m.sourceType).toBe("SIGNATURE_ACTION");expect(m.beats.length).toBe(3);});
 it("ordinary action maps to motion context",()=>{const b=buildOrinPerformanceBible(),a=b.actionGuide.attackVocabulary[0],m=buildMotionChoreographyContext({bible:b,context,actionPatternId:a.id});expect(m.sourceType).toBe("ACTION_PATTERN");});
});

describe("VFX and Sound integration contracts",()=>{
 it("VFX integration preserves canonical energy shape",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],v=buildAbilityVfxIntegration(a,context);expect(v.energyShape).toMatch(/compressed organic rings/i);});
 it("VFX integration includes palette",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],v=buildAbilityVfxIntegration(a,context);expect(v.palette.length).toBeGreaterThan(0);});
 it("Sound integration identifies ability and variant",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],s=buildAbilitySoundIntegration(a,context);expect(s.abilityId).toBe(a.id);expect(s.variantId).toBe(a.variants[0].id);});
 it("Sound integration includes recurring motif",()=>{const b=buildOrinPerformanceBible(),a=b.abilityKit[0],s=buildAbilitySoundIntegration(a,context);expect(s.recurringMotif).toMatch(/heartbeat/i);});
 it("contracts do not mutate source Bible",()=>{const b=buildOrinPerformanceBible(),before=JSON.stringify(b),a=b.abilityKit[0];buildProductionFramePerformanceContext({bible:b,context,abilityId:a.id});buildMotionChoreographyContext({bible:b,context,abilityId:a.id});buildAbilitySoundIntegration(a,context);buildAbilityVfxIntegration(a,context);expect(JSON.stringify(b)).toBe(before);});
});
