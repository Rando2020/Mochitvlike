import {buildValidMotion} from "@/lib/motion/__tests__/fixtures";
import {compileEpisodeTimeline} from "../compileEpisodeTimeline";

export function buildReadyEpisodeSources(){
  const f=buildValidMotion();
  const motionPlan=structuredClone(f.plan);
  motionPlan.clips.forEach((clip,index)=>{
    if(clip.generationStatus==="SKIPPED"){clip.outputAsset=null;return;}
    clip.generationStatus="COMPLETED";
    const duration=Math.max(clip.targetDurationSeconds,Math.ceil(clip.targetDurationSeconds));
    clip.outputAsset={
      url:"https://example.com/motion-"+index+".mp4",
      storagePath:"motion-"+index+".mp4",
      durationSeconds:duration,
      width:1280,height:720,mimeType:"video/mp4"
    };
  });
  return{...f,motionPlan};
}

export function buildValidEpisodeTimeline(){
  const f=buildReadyEpisodeSources();
  const timeline=compileEpisodeTimeline({
    assemblyId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    seriesId:f.motionPlan.seriesId,
    episodeKey:"episodeOne",
    version:1,
    scenes:[{
      order:0,motionPlanStatus:"READY",series:f.series,scene:f.scene,script:f.script,
      visualPlan:f.visualPlan,storyboard:f.storyboard,animatic:f.timeline,motionPlan:f.motionPlan
    }]
  });
  return{...f,episodeTimeline:timeline};
}
