import {buildValidAnimatic} from "@/lib/animatics/__tests__/fixtures";
import {compileMotionPlan} from "../compileMotionPlan";

export function buildValidMotion(){
  const f=buildValidAnimatic();
  const plan=compileMotionPlan({
    motionPlanId:"99999999-9999-4999-8999-999999999999",version:1,
    series:f.series,scene:f.scene,script:f.script,visualPlan:f.visualPlan,storyboard:f.storyboard,animatic:f.timeline
  });
  return{...f,plan};
}
