import { compileCharacterDirection } from "@/lib/character-direction/compile";
import {createHash} from "node:crypto";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import {OPENAI_VOICES,VOICE_DISPLAY_NAMES,type OpenAIVoiceId} from "./voiceRegistry";
import type {VoiceAssignment,VoiceCast} from "./types";

function stableIndex(seed:string,length:number){
  const hex=createHash("sha256").update(seed).digest("hex").slice(0,8);
  return parseInt(hex,16)%length;
}
function styleFor(member:SeriesBlueprint["cast"][number]){
  const text=[member.role,member.storyFunction,...member.personalityTraits,member.characterSheetSeed.communicationStyle].join(" ").toLowerCase();
  const energetic=/energetic|bold|impulsive|playful|excitable|intense|fiery/.test(text);
  const restrained=/calm|reserved|stoic|measured|quiet|thoughtful|gentle/.test(text);
  const explicit = member.generationDirection;
  const voiceGuidance = explicit ? compileCharacterDirection(explicit).voice : [];
  const defaultStyle = energetic?"animated and conversational":restrained?"measured and natural":"natural and characterful";
  return{
    speakingStyle:voiceGuidance.length ? voiceGuidance.join(" ") + (explicit?.voiceDelivery ? "" : " " + defaultStyle) :defaultStyle,
    energy:explicit?.voiceDelivery === "animated" ? "high" : explicit?.voiceDelivery === "calm" ? "low-to-moderate" : explicit?.voiceDelivery === "firm" ? "moderate" : energetic?"high":restrained?"low-to-moderate":"moderate",
    emotionalRange:/volatile|dramatic|expressive|emotional/.test(text)?"wide":"balanced"
  };
}
export function buildVoiceCast(input:{voiceCastId:string;seriesId:string;episodeAssemblyId:string;version:number;series:SeriesBlueprint;timeline:EpisodeTimeline}):VoiceCast{
  const speakingIds=new Set(input.timeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues.map(d=>d.characterId))));
  const speakers=input.series.cast.filter(c=>speakingIds.has(c.id));
  const assignments:VoiceAssignment[]=speakers.map(member=>{
    const voice=OPENAI_VOICES[stableIndex(member.id,OPENAI_VOICES.length)] as OpenAIVoiceId;
    const style=styleFor(member);
    return{
      id:"voice-"+member.id,
      characterId:member.id,
      characterName:member.name,
      voiceProfile:{
        provider:"openai",providerVoiceId:voice,displayName:VOICE_DISPLAY_NAMES[voice],
        descriptors:["AI-generated","production voice"],language:"auto",accentDirection:null,
        speakingStyle:style.speakingStyle,energy:style.energy,emotionalRange:style.emotionalRange
      },
      source:"AUTO_SELECTED"
    };
  });
  return{
    id:input.voiceCastId,seriesId:input.seriesId,episodeAssemblyId:input.episodeAssemblyId,version:input.version,assignments,
    confidence:{overall:.85,assumptions:[
      "Voice IDs are selected deterministically from OpenAI built-in voices.",
      "Selection does not use race, ethnicity, appearance, presumed gender, or celebrity likeness."
    ]}
  };
}
