import type {GeneratedSoundAudio,MusicQualityValidator,SoundEffectQualityValidator,SoundQualityResult} from "./types";
async function validate(audio:GeneratedSoundAudio):Promise<SoundQualityResult>{
 const checks:string[]=[];
 if(audio.mimeType!=="audio/mpeg")return{ok:false,code:"INVALID_SOUND_RESPONSE",checks};
 checks.push("expected audio MIME");
 if(audio.bytes.byteLength<128)return{ok:false,code:"INVALID_SOUND_RESPONSE",checks};
 checks.push("non-empty audio payload");
 if(!Number.isFinite(audio.durationSeconds)||audio.durationSeconds<=0)return{ok:false,code:"INVALID_SOUND_RESPONSE",checks};
 checks.push("positive requested duration metadata");
 return{ok:true,code:null,checks};
}
export class TechnicalMusicQualityValidator implements MusicQualityValidator{validate({audio}:{audio:GeneratedSoundAudio}){return validate(audio);}}
export class TechnicalSoundEffectQualityValidator implements SoundEffectQualityValidator{validate({audio}:{audio:GeneratedSoundAudio}){return validate(audio);}}
