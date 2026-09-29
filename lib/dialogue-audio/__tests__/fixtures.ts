import {buildValidEpisodeTimeline} from "@/lib/episodes/assembly/__tests__/fixtures";
import {buildVoiceCast} from "../selectVoiceCast";
import {compileDialogueAudioPlan} from "../compileDialogueAudioPlan";

export function buildValidDialogue(){
  const f=buildValidEpisodeTimeline();
  const voiceCast=buildVoiceCast({
    voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,
    series:f.series,timeline:f.episodeTimeline
  });
  const plan=compileDialogueAudioPlan({
    planId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,
    voiceCast,timeline:f.episodeTimeline,version:1
  });
  return{...f,voiceCast,plan};
}
