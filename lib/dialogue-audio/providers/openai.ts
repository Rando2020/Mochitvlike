import OpenAI from "openai";
import type {DialogueSpeechProvider,GeneratedDialogueAudio} from "../types";
import {parseWavMetadata} from "../wav";
import {TTSProviderMalformedResponseError,TTSProviderRefusalError,TTSProviderTimeoutError,TTSProviderTransientError} from "./errors";

const VOICES=new Set(["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"]);

export class OpenAIDialogueSpeechProvider implements DialogueSpeechProvider{
  readonly name="openai";
  readonly model=process.env.OPENAI_TTS_MODEL??"gpt-4o-mini-tts";
  private readonly client:OpenAI;
  constructor(client?:OpenAI){this.client=client??new OpenAI({apiKey:process.env.OPENAI_API_KEY});}

  async generate(input:{text:string;voiceId:string;instructions:string;responseFormat:"wav";signal?:AbortSignal}):Promise<GeneratedDialogueAudio>{
    if(!VOICES.has(input.voiceId))throw new TTSProviderMalformedResponseError("VOICE_ASSIGNMENT_INVALID");
    try{
      const response=await this.client.audio.speech.create({
        model:this.model,input:input.text,voice:input.voiceId as any,instructions:input.instructions,response_format:"wav"
      },{signal:input.signal});
      const bytes=new Uint8Array(await response.arrayBuffer()),meta=parseWavMetadata(bytes);
      return{bytes,mimeType:"audio/wav",durationSeconds:meta.durationSeconds,sampleRate:meta.sampleRate,channels:meta.channels,provider:this.name,model:this.model};
    }catch(error:any){
      if(error?.name==="AbortError"||error?.code==="ABORT_ERR")throw new TTSProviderTimeoutError();
      if(error instanceof TTSProviderMalformedResponseError)throw error;
      const status=error?.status;
      if(status===400||status===422)throw new TTSProviderRefusalError();
      if(status===408||status===409||status===429||status>=500)throw new TTSProviderTransientError();
      throw new TTSProviderTransientError();
    }
  }
}
