import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("../storage",()=>({uploadDialogueAudio:vi.fn(),removeDialogueAudio:vi.fn()}));
import {uploadDialogueAudio,removeDialogueAudio} from "../storage";
import {processDialogueAudioJob} from "../jobs/processDialogueAudioJob";
import {buildValidDialogue} from "./fixtures";
import {buildDialogueAudioSpec} from "../buildDialogueAudioSpec";
import {compileSpeechInstructions} from "../compileSpeechInstructions";
import {TTSProviderRefusalError,TTSProviderTimeoutError} from "../providers/errors";

const f=buildValidDialogue(),line=f.plan.lines[0],spec=buildDialogueAudioSpec(f.plan,f.voiceCast,line.id),compiled=compileSpeechInstructions(spec);
const audio={bytes:new Uint8Array(2048),mimeType:"audio/wav" as const,durationSeconds:Math.max(.8,line.visualWindowSeconds),sampleRate:24000,channels:1,provider:"test",model:"test"};
const provider={name:"openai",model:"gpt-4o-mini-tts",generate:vi.fn(async()=>audio)};

function fakeSupabase(opts:{status?:string;claim?:string;textChecksum?:string;scriptText?:string;complete?:boolean;renew?:boolean}={}){
 let status=opts.status??"GENERATING";
 const rows:any={
  dialogue_audio_generations:{id:"job",dialogue_plan_id:f.plan.id,line_id:line.id,script_block_id:line.scriptBlockId,character_id:line.characterId,creator_id:"u",status,provider:"openai",model:"gpt-4o-mini-tts",provider_voice_id:spec.voice.providerVoiceId,instruction_checksum:compiled.checksum,instruction_version:"1.0",text_checksum:opts.textChecksum??line.textChecksum,episode_start_seconds:line.episodeStartSeconds,visual_window_seconds:line.visualWindowSeconds,attempt_id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",claim_token:opts.claim??"claim"},
  dialogue_audio_plans:{id:f.plan.id,episode_assembly_id:f.episodeTimeline.id,voice_cast_id:f.voiceCast.id,plan:f.plan},
  voice_casts:{cast:f.voiceCast},
  episode_assemblies:{timeline:f.episodeTimeline},
  motion_plans:{script_id:f.script.id},
  scene_scripts:{script:{...f.script,blocks:f.script.blocks.map(b=>b.type==="DIALOGUE"&&b.id===line.scriptBlockId?{...b,text:opts.scriptText??b.text}:b)}}
 };
 const lists:any={episode_assembly_scenes:[{motion_plan_id:f.motionPlan.id}]};
 const rpc=vi.fn(async(name:string)=>{
   if(name==="renew_dialogue_audio_generation_lease")return{data:opts.renew??true,error:null};
   if(name==="complete_dialogue_audio_generation"){if(opts.complete===false)return{data:false,error:null};status="COMPLETED";rows.dialogue_audio_generations.status=status;return{data:true,error:null};}
   if(name==="fail_dialogue_audio_generation"){status="FAILED";rows.dialogue_audio_generations.status=status;return{data:true,error:null};}
   return{data:null,error:null};
 });
 const from=(table:string)=>{
   const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:rows[table],error:null}),then:(resolve:any,reject:any)=>Promise.resolve({data:lists[table]??[],error:null}).then(resolve,reject)};
   return chain;
 };
 return{from,rpc} as any;
}

beforeEach(()=>{vi.clearAllMocks();vi.mocked(uploadDialogueAudio).mockResolvedValue({storagePath:"line.wav",url:"https://example.com/line.wav"});});
afterEach(()=>{vi.useRealTimers();});

describe("processDialogueAudioJob",()=>{
 it("completes a valid line",async()=>expect(await processDialogueAudioJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider})).toBe("COMPLETED"));
 it("calls provider once",async()=>{await processDialogueAudioJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("duplicate delivery after completion does not call provider twice",async()=>{const s=fakeSupabase();await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider});await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("stale claim performs zero provider calls",async()=>{expect(await processDialogueAudioJob({supabase:fakeSupabase({claim:"new"}),jobId:"job",claimToken:"old",provider})).toBe("STALE");expect(provider.generate).not.toHaveBeenCalled();});
 it("text checksum mismatch blocks provider",async()=>{const s=fakeSupabase({textChecksum:"0".repeat(64)});expect(await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider})).toBe("FAILED");expect(provider.generate).not.toHaveBeenCalled();expect(s.rpc).toHaveBeenCalledWith("fail_dialogue_audio_generation",expect.objectContaining({p_error_code:"DIALOGUE_TEXT_MISMATCH"}));});
 it("source Script mismatch blocks provider",async()=>{const s=fakeSupabase({scriptText:"different authoritative text"});expect(await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider})).toBe("FAILED");expect(provider.generate).not.toHaveBeenCalled();});
 it("stale completion removes uploaded attempt",async()=>{expect(await processDialogueAudioJob({supabase:fakeSupabase({complete:false}),jobId:"job",claimToken:"claim",provider})).toBe("STALE");expect(removeDialogueAudio).toHaveBeenCalledWith(expect.anything(),"line.wav");});
 it("provider timeout becomes sanitized FAILED",async()=>{const p={...provider,generate:vi.fn(async()=>{throw new TTSProviderTimeoutError();})},s=fakeSupabase();expect(await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider:p})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_dialogue_audio_generation",expect.objectContaining({p_error_code:"TTS_PROVIDER_TIMEOUT"}));});
 it("provider refusal becomes sanitized FAILED",async()=>{const p={...provider,generate:vi.fn(async()=>{throw new TTSProviderRefusalError();})},s=fakeSupabase();expect(await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider:p})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_dialogue_audio_generation",expect.objectContaining({p_error_code:"TTS_GENERATION_DECLINED"}));});
 it("storage failure becomes sanitized FAILED",async()=>{vi.mocked(uploadDialogueAudio).mockRejectedValueOnce(new Error("DIALOGUE_AUDIO_STORAGE_FAILED"));const s=fakeSupabase();expect(await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider})).toBe("FAILED");});
 it("persists timing fit on completion",async()=>{const s=fakeSupabase();await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(s.rpc).toHaveBeenCalledWith("complete_dialogue_audio_generation",expect.objectContaining({p_timing_fit:expect.stringMatching(/FITS|TOO_LONG|VERY_SHORT/)}));});
 it("does not persist plaintext provider instructions",async()=>{const s=fakeSupabase();await processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(JSON.stringify(s.rpc.mock.calls)).not.toContain("Speak the provided input text exactly");});
 it("heartbeat renews a long-running claim",async()=>{vi.useFakeTimers();let resolve:any;const p={...provider,generate:vi.fn(()=>new Promise(r=>{resolve=r;}))};const s=fakeSupabase();const promise=processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider:p});await vi.advanceTimersByTimeAsync(46000);expect(s.rpc).toHaveBeenCalledWith("renew_dialogue_audio_generation_lease",expect.anything());resolve(audio);await vi.runAllTimersAsync();await promise;});
 it("lost heartbeat ownership prevents commit",async()=>{vi.useFakeTimers();let resolve:any;const p={...provider,generate:vi.fn(()=>new Promise(r=>{resolve=r;}))};const s=fakeSupabase({renew:false});const promise=processDialogueAudioJob({supabase:s,jobId:"job",claimToken:"claim",provider:p});await vi.advanceTimersByTimeAsync(46000);resolve(audio);await vi.runAllTimersAsync();expect(await promise).toBe("STALE");});
});
