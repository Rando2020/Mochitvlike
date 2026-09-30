import type {MusicGenerationProvider,SoundEffectProvider,GeneratedSoundAudio} from "../types";
import {SoundProviderMalformedResponseError,SoundProviderRefusalError,SoundProviderTimeoutError,SoundProviderTransientError} from "./errors";

async function requestAudio(url:string,body:unknown,signal?:AbortSignal){
 const key=process.env.ELEVENLABS_API_KEY;if(!key)throw new SoundProviderTransientError();
 try{
   const response=await fetch(url,{method:"POST",headers:{"xi-api-key":key,"Content-Type":"application/json"},body:JSON.stringify(body),signal});
   if(response.status===400||response.status===422)throw new SoundProviderRefusalError();
   if(response.status===408||response.status===409||response.status===429||response.status>=500)throw new SoundProviderTransientError();
   if(!response.ok)throw new SoundProviderTransientError();
   const contentType=response.headers.get("content-type")??"";
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.byteLength<128||(!contentType.includes("audio")&&!contentType.includes("octet-stream")))throw new SoundProviderMalformedResponseError();
   return bytes;
 }catch(error:any){
   if(error instanceof SoundProviderRefusalError||error instanceof SoundProviderTransientError||error instanceof SoundProviderMalformedResponseError)throw error;
   if(error?.name==="AbortError"||error?.code==="ABORT_ERR")throw new SoundProviderTimeoutError();
   throw new SoundProviderTransientError();
 }
}

export class ElevenLabsMusicProvider implements MusicGenerationProvider{
 readonly name="elevenlabs-music";
 readonly model=process.env.ELEVENLABS_MUSIC_MODEL??"music_v2_5";
 async generate(input:{prompt:string;durationSeconds:number;signal?:AbortSignal}):Promise<GeneratedSoundAudio>{
   const duration=Math.max(3,Math.min(300,input.durationSeconds));
   const bytes=await requestAudio("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",{
     prompt:input.prompt,music_length_ms:Math.round(duration*1000),model_id:this.model,force_instrumental:true,store_for_inpainting:false
   },input.signal);
   return{bytes,mimeType:"audio/mpeg",durationSeconds:duration,durationSource:"REQUESTED",provider:this.name,model:this.model};
 }
}
export class ElevenLabsSoundEffectProvider implements SoundEffectProvider{
 readonly name="elevenlabs-sfx";
 readonly model=process.env.ELEVENLABS_SOUND_MODEL??"eleven_text_to_sound_v2";
 async generate(input:{prompt:string;durationSeconds:number;loop:boolean;signal?:AbortSignal}):Promise<GeneratedSoundAudio>{
   const duration=Math.max(.5,Math.min(30,input.durationSeconds));
   const bytes=await requestAudio("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",{
     text:input.prompt,loop:input.loop,duration_seconds:duration,prompt_influence:.55,model_id:this.model
   },input.signal);
   return{bytes,mimeType:"audio/mpeg",durationSeconds:duration,durationSource:"REQUESTED",provider:this.name,model:this.model};
 }
}
