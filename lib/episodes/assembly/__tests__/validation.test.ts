import {describe,expect,it} from "vitest";
import {buildValidEpisodeTimeline} from "./fixtures";
import {validateEpisodeTimeline} from "../validateEpisodeTimeline";

function validate(timeline:any,f=buildValidEpisodeTimeline()){
  return validateEpisodeTimeline(timeline,[{sceneId:f.motionPlan.sceneId,script:f.script,animatic:f.timeline,motionPlan:f.motionPlan}],{
    assemblyId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",seriesId:f.motionPlan.seriesId,episodeKey:"episodeOne",version:1
  });
}
describe("EpisodeTimeline validation",()=>{
 it("accepts valid timeline",()=>{const f=buildValidEpisodeTimeline();expect(validate(f.episodeTimeline,f).success).toBe(true);});
 it("rejects duplicate clip IDs",()=>{const f=buildValidEpisodeTimeline();if(f.episodeTimeline.scenes[0].clips[1])f.episodeTimeline.scenes[0].clips[1].id=f.episodeTimeline.scenes[0].clips[0].id;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects non-contiguous clip order",()=>{const f=buildValidEpisodeTimeline();if(f.episodeTimeline.scenes[0].clips[1])f.episodeTimeline.scenes[0].clips[1].sequenceIndex=8;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects changed Animatic duration",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.scenes[0].clips[0].durationSeconds+=1;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects source video shorter than used window",()=>{const f=buildValidEpisodeTimeline();const c=f.episodeTimeline.scenes[0].clips.find(x=>x.mediaType==="MOTION_VIDEO");if(c)c.asset.sourceDurationSeconds=.1;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects wrong Motion asset",()=>{const f=buildValidEpisodeTimeline();const c=f.episodeTimeline.scenes[0].clips.find(x=>x.mediaType==="MOTION_VIDEO");if(c)c.asset.url="https://example.com/wrong.mp4";expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects SKIPPED clip using generated output",()=>{const f=buildValidEpisodeTimeline();const i=f.motionPlan.clips.findIndex(x=>x.generationStatus==="SKIPPED");if(i>=0){f.episodeTimeline.scenes[0].clips[i].mediaType="MOTION_VIDEO";expect(validate(f.episodeTimeline,f).success).toBe(false);}});
 it("rejects rewritten dialogue",()=>{const f=buildValidEpisodeTimeline();const cue=f.episodeTimeline.scenes[0].clips.flatMap(c=>c.dialogueCues)[0];if(cue)cue.text+=" changed";expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects wrong dialogue character",()=>{const f=buildValidEpisodeTimeline();const cue=f.episodeTimeline.scenes[0].clips.flatMap(c=>c.dialogueCues)[0];if(cue)cue.characterId="wrong";expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects non-zero v1 source offset",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.scenes[0].clips[0].sourceOffsetSeconds=.2;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects incomplete visual coverage flag",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.validation.hasVisualCoverage=false;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects incomplete Script coverage flag",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.validation.hasScriptCoverage=false;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects unexpected audio fields",()=>{const f=buildValidEpisodeTimeline();expect(validate({...f.episodeTimeline,audioTrack:"x"},f).success).toBe(false);});
 it("rejects unexpected prompt/provider fields",()=>{const f=buildValidEpisodeTimeline();expect(validate({...f.episodeTimeline,promptChecksum:"x",provider:"x"},f).success).toBe(false);});
 it("rejects scene overlap/start mismatch",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.scenes[0].startSeconds=1;expect(validate(f.episodeTimeline,f).success).toBe(false);});
 it("rejects Episode duration mismatch",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.targetDurationSeconds+=2;expect(validate(f.episodeTimeline,f).success).toBe(false);});
});

