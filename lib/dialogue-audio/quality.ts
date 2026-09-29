import type {DialogueAudioQualityValidator,DialogueAudioQualityResult,GeneratedDialogueAudio} from "./types";
export class TechnicalDialogueAudioQualityValidator implements DialogueAudioQualityValidator{
  async validate({audio}:{audio:GeneratedDialogueAudio}):Promise<DialogueAudioQualityResult>{
    const checks:string[]=[];
    if(audio.mimeType!=="audio/wav")return{ok:false,code:"INVALID_TTS_RESPONSE",checks};
    checks.push("WAV MIME");
    if(audio.bytes.byteLength<44)return{ok:false,code:"INVALID_TTS_RESPONSE",checks};
    checks.push("non-empty WAV payload");
    if(audio.durationSeconds<=0||!Number.isFinite(audio.durationSeconds))return{ok:false,code:"INVALID_TTS_RESPONSE",checks};
    checks.push("positive duration");
    if(audio.sampleRate<8000||audio.channels<1)return{ok:false,code:"INVALID_TTS_RESPONSE",checks};
    checks.push("basic PCM metadata");
    return{ok:true,code:null,checks};
  }
}
export function createDialogueAudioQualityValidator():DialogueAudioQualityValidator{return new TechnicalDialogueAudioQualityValidator();}
