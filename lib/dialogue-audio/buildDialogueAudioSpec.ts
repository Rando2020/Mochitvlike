import type {DialogueAudioPlan,DialogueAudioSpec,VoiceCast} from "./types";
export function buildDialogueAudioSpec(plan:DialogueAudioPlan,cast:VoiceCast,lineId:string):DialogueAudioSpec{
  const line=plan.lines.find(l=>l.id===lineId);if(!line)throw new Error("DIALOGUE_LINE_NOT_FOUND");
  const assignment=cast.assignments.find(a=>a.id===line.voiceAssignmentId&&a.characterId===line.characterId);
  if(!assignment)throw new Error("VOICE_ASSIGNMENT_INVALID");
  return{
    lineId:line.id,characterId:line.characterId,text:line.text,textChecksum:line.textChecksum,
    voice:{providerVoiceId:assignment.voiceProfile.providerVoiceId,speakingStyle:assignment.voiceProfile.speakingStyle,energy:assignment.voiceProfile.energy},
    timingContext:{episodeStartSeconds:line.episodeStartSeconds,visualWindowSeconds:line.visualWindowSeconds}
  };
}
