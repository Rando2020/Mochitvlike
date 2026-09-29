import { describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { buildVisualPlanningContext } from "../context/buildVisualPlanningContext";
import { generateVisualPlan, VisualPlanGenerationError, type VisualPlanProvider } from "../generateVisualPlan";
import { buildValidVisualPlan } from "./fixtures";

const seriesId="22222222-2222-4222-8222-222222222222"; const scene=buildValidScene(); const script=buildValidScript();
const context=buildVisualPlanningContext({seriesId,sceneId:scene.id,scriptId:script.id,version:1,series:theWoundsWeKeep,scene,script});
function provider(a:unknown,b:unknown=a):VisualPlanProvider{return{
 generate:vi.fn(async({planId,context})=>({...a as object,id:planId,seriesId:context.seriesId,sceneId:context.sceneId,scriptId:context.scriptId,version:context.version})),
 repair:vi.fn(async({planId,context})=>({...b as object,id:planId,seriesId:context.seriesId,sceneId:context.sceneId,scriptId:context.scriptId,version:context.version}))
};}
describe("generateVisualPlan",()=>{
 it("accepts valid first generation",async()=>{const p=provider(buildValidVisualPlan());const r=await generateVisualPlan({seriesId,sceneId:scene.id,scriptId:script.id,version:1,series:theWoundsWeKeep,scene,script,context},p);expect(r.source).toBe("llm");});
 it("repairs once",async()=>{const bad=buildValidVisualPlan();bad.continuity.locationId=null;const p=provider(bad,buildValidVisualPlan());const r=await generateVisualPlan({seriesId,sceneId:scene.id,scriptId:script.id,version:1,series:theWoundsWeKeep,scene,script,context},p);expect(r.source).toBe("repaired");expect(p.repair).toHaveBeenCalledTimes(1);});
 it("fails after invalid repair",async()=>{const bad=buildValidVisualPlan();bad.continuity.locationId=null;await expect(generateVisualPlan({seriesId,sceneId:scene.id,scriptId:script.id,version:1,series:theWoundsWeKeep,scene,script,context},provider(bad,bad))).rejects.toBeInstanceOf(VisualPlanGenerationError);});
 it("has no fallback",async()=>{const bad=buildValidVisualPlan();bad.continuityChecks.protectedMysteries=[];await expect(generateVisualPlan({seriesId,sceneId:scene.id,scriptId:script.id,version:1,series:theWoundsWeKeep,scene,script,context},provider(bad,bad))).rejects.toMatchObject({code:"VISUAL_PLAN_REPAIR_FAILED"});});
 it("does not mutate upstream state",async()=>{const s=structuredClone(theWoundsWeKeep),sc=structuredClone(scene),sr=structuredClone(script);const before=[JSON.stringify(s),JSON.stringify(sc),JSON.stringify(sr)];await generateVisualPlan({seriesId,sceneId:sc.id,scriptId:sr.id,version:1,series:s,scene:sc,script:sr,context},provider(buildValidVisualPlan()));expect([JSON.stringify(s),JSON.stringify(sc),JSON.stringify(sr)]).toEqual(before);});
});