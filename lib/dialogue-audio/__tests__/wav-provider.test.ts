import {describe,expect,it,vi} from "vitest";
import {parseWavMetadata} from "../wav";
import {OpenAIDialogueSpeechProvider} from "../providers/openai";
import {TechnicalDialogueAudioQualityValidator} from "../quality";
import {TTSProviderMalformedResponseError,TTSProviderRefusalError,TTSProviderTimeoutError,TTSProviderTransientError} from "../providers/errors";

function wav(seconds=1,sampleRate=24000,channels=1,bits=16){
  const dataBytes=Math.floor(seconds*sampleRate*channels*(bits/8)),bytes=new Uint8Array(44+dataBytes),v=new DataView(bytes.buffer);
  const write=(o:number,s:string)=>[...s].forEach((c,i)=>bytes[o+i]=c.charCodeAt(0));
  write(0,"RIFF");v.setUint32(4,36+dataBytes,true);write(8,"WAVE");write(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,sampleRate,true);
  const byteRate=sampleRate*channels*(bits/8);v.setUint32(28,byteRate,true);v.setUint16(32,channels*(bits/8),true);v.setUint16(34,bits,true);write(36,"data");v.setUint32(40,dataBytes,true);return bytes;
}
describe("WAV parsing",()=>{
 it("reads duration",()=>expect(parseWavMetadata(wav(2.5)).durationSeconds).toBeCloseTo(2.5,3));
 it("reads sample rate",()=>expect(parseWavMetadata(wav(1,24000)).sampleRate).toBe(24000));
 it("reads channels",()=>expect(parseWavMetadata(wav(1,24000,2)).channels).toBe(2));
 it("rejects non-WAV",()=>expect(()=>parseWavMetadata(new Uint8Array(100))).toThrow(TTSProviderMalformedResponseError));
 it("rejects empty payload",()=>expect(()=>parseWavMetadata(new Uint8Array())).toThrow());
});
describe("OpenAI speech provider",()=>{
 it("sends current gpt-4o-mini-tts speech request",async()=>{const create=vi.fn(async()=>({arrayBuffer:async()=>wav(1).buffer}));const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create}}} as any);const out=await provider.generate({text:"Exact line.",voiceId:"coral",instructions:"Speak exactly.",responseFormat:"wav"});expect(create).toHaveBeenCalledWith(expect.objectContaining({model:"gpt-4o-mini-tts",input:"Exact line.",voice:"coral",instructions:"Speak exactly.",response_format:"wav"}),expect.any(Object));expect(out.mimeType).toBe("audio/wav");});
 it("captures natural duration",async()=>{const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create:async()=>({arrayBuffer:async()=>wav(3.4).buffer})}}} as any);expect((await provider.generate({text:"x",voiceId:"coral",instructions:"x",responseFormat:"wav"})).durationSeconds).toBeCloseTo(3.4,3);});
 it("rejects unknown voice before provider call",async()=>{const create=vi.fn();const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create}}} as any);await expect(provider.generate({text:"x",voiceId:"not-a-voice",instructions:"x",responseFormat:"wav"})).rejects.toThrow(TTSProviderMalformedResponseError);expect(create).not.toHaveBeenCalled();});
 it("maps refusal-like 400",async()=>{const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create:async()=>{throw {status:400};}}}} as any);await expect(provider.generate({text:"x",voiceId:"coral",instructions:"x",responseFormat:"wav"})).rejects.toThrow(TTSProviderRefusalError);});
 it("maps transient 429",async()=>{const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create:async()=>{throw {status:429};}}}} as any);await expect(provider.generate({text:"x",voiceId:"coral",instructions:"x",responseFormat:"wav"})).rejects.toThrow(TTSProviderTransientError);});
 it("maps abort",async()=>{const provider=new OpenAIDialogueSpeechProvider({audio:{speech:{create:async()=>{const e:any=new Error("abort");e.name="AbortError";throw e;}}}} as any);await expect(provider.generate({text:"x",voiceId:"coral",instructions:"x",responseFormat:"wav"})).rejects.toThrow(TTSProviderTimeoutError);});
});
describe("Technical audio quality",()=>{
 const good={bytes:wav(1),mimeType:"audio/wav" as const,durationSeconds:1,sampleRate:24000,channels:1,provider:"openai",model:"gpt-4o-mini-tts"};
 it("accepts sane WAV result",async()=>expect((await new TechnicalDialogueAudioQualityValidator().validate({audio:good})).ok).toBe(true));
 it("rejects wrong MIME",async()=>expect((await new TechnicalDialogueAudioQualityValidator().validate({audio:{...good,mimeType:"audio/mp3" as any}})).ok).toBe(false));
 it("rejects empty bytes",async()=>expect((await new TechnicalDialogueAudioQualityValidator().validate({audio:{...good,bytes:new Uint8Array()}})).ok).toBe(false));
 it("does not claim acting quality",async()=>{const q=await new TechnicalDialogueAudioQualityValidator().validate({audio:good});expect(q.checks.join(" ")).not.toMatch(/acting|emotion|naturalness|accent/i);});
});
