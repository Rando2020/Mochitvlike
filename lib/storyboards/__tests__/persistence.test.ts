import {describe,expect,it} from "vitest";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "../compileStoryboardBlueprint";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {materializeStoryboard} from "../persistence";
const bp=compileStoryboardBlueprint({storyboardId:"66666666-6666-4666-8666-666666666666",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:"11111111-1111-4111-8111-111111111111",scriptId:"33333333-3333-4333-8333-333333333333",visualPlanId:"55555555-5555-4555-8555-555555555555",version:1,series:theWoundsWeKeep,scene:buildValidScene(),script:buildValidScript(),visualPlan:buildValidVisualPlan()}).blueprint;
describe("storyboard materialization",()=>{
 it("overlays completed assets without mutating blueprint",()=>{const before=JSON.stringify(bp);const p=bp.panels[0];const m=materializeStoryboard(bp,[{panelId:p.id,status:"COMPLETED",asset:{url:"u",storagePath:"s",width:1536,height:1024,mimeType:"image/png"},errorCode:null,retryCount:0}]);expect(m.panels[0].asset?.url).toBe("u");expect(JSON.stringify(bp)).toBe(before);});
 it("overlays FAILED state",()=>{const p=bp.panels[0];expect(materializeStoryboard(bp,[{panelId:p.id,status:"FAILED",asset:null,errorCode:"X",retryCount:1}]).panels[0].generationStatus).toBe("FAILED");});
 it("leaves unknown panels untouched",()=>expect(materializeStoryboard(bp,[]).panels[0].generationStatus).toBe("PENDING"));
 it("preserves sequence ordering",()=>expect(materializeStoryboard(bp,[]).panels.map(p=>p.sequenceIndex)).toEqual(bp.panels.map(p=>p.sequenceIndex)));
 it("does not write errors into blueprint",()=>{const p=bp.panels[0];const m=materializeStoryboard(bp,[{panelId:p.id,status:"FAILED",asset:null,errorCode:"SAFE_ERROR",retryCount:1}]);expect(m.panels[0]).not.toHaveProperty("errorCode");});
});