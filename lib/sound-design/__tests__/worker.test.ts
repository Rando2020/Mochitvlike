import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("../storage",()=>({uploadSoundAsset:vi.fn(),removeSoundAsset:vi.fn()}));
import {uploadSoundAsset,removeSoundAsset} from "../storage";
import {processSoundJob} from "../jobs/processSoundJob";
import {buildValidSound} from "./fixtures";
import {buildMusicGenerationPrompt,buildEffectGenerationPrompt} from "../prompts";
import {SoundProviderTimeoutError,SoundProviderRefusalError} from "../providers/errors";
import type {GeneratedSoundAudio,MusicGenerationProvider} from "../types";

const f=buildValidSound();
const cue=f.soundPlan.cues.find(c=>c.type==="MUSIC")!;
const compiled=cue.type==="MUSIC"?buildMusicGenerationPrompt(cue):buildEffectGenerationPrompt(cue as any);
const audio:GeneratedSoundAudio={bytes:new Uint8Array(600),mimeType:"audio/mpeg",durationSeconds:cue.durationSeconds,durationSource:"REQUESTED",provider:"elevenlabs-music",model:"music_v2_5"};
const musicProvider:MusicGenerationProvider={name:"elevenlabs-music",model:"music_v2_5",generate:vi.fn(async()=>audio)};

function db(opts:{status?:string;claim?:string;complete?:boolean;renew?:boolean;checksum?:string}={}){
 const rows:any={sound_audio_generations:{id:"job",sound_plan_id:f.soundPlan.id,cue_id:cue.id,cue_type:cue.type,creator_id:"u",status:opts.status??"GENERATING",provider:"elevenlabs-music",model:"music_v2_5",instruction_checksum:opts.checksum??compiled.checksum,instruction_version:"1.0",requested_duration_seconds:cue.durationSeconds,loopable:false,attempt_id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",claim_token:opts.claim??"claim"},sound_design_plans:{plan:f.soundPlan}};
 const rpc=vi.fn(async(name:string)=>name==="renew_sound_generation_lease"?{data:opts.renew??true,error:null}:name==="complete_sound_generation"?{data:opts.complete??true,error:null}:{data:true,error:null});
 const from=(table:string)=>{const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:rows[table],error:null})};return chain;};
 return{from,rpc} as any;
}
beforeEach(()=>{vi.clearAllMocks();vi.mocked(uploadSoundAsset).mockResolvedValue({storagePath:"sound.mp3",url:"https://example.com/sound.mp3"});});
afterEach(()=>vi.useRealTimers());

describe("processSoundJob",()=>{
 it("completes valid music cue",async()=>expect(await processSoundJob({supabase:db(),jobId:"job",claimToken:"claim",musicProvider})).toBe("COMPLETED"));
 it("calls provider once",async()=>{await processSoundJob({supabase:db(),jobId:"job",claimToken:"claim",musicProvider});expect(musicProvider.generate).toHaveBeenCalledTimes(1);});
 it("stale claim performs zero provider calls",async()=>{expect(await processSoundJob({supabase:db({claim:"new"}),jobId:"job",claimToken:"old",musicProvider})).toBe("STALE");expect(musicProvider.generate).not.toHaveBeenCalled();});
 it("spec checksum mismatch blocks provider",async()=>{const s=db({checksum:"bad"});expect(await processSoundJob({supabase:s,jobId:"job",claimToken:"claim",musicProvider})).toBe("FAILED");expect(musicProvider.generate).not.toHaveBeenCalled();});
 it("stale completion removes uploaded asset",async()=>{expect(await processSoundJob({supabase:db({complete:false}),jobId:"job",claimToken:"claim",musicProvider})).toBe("STALE");expect(removeSoundAsset).toHaveBeenCalledWith(expect.anything(),"sound.mp3");});
 it("timeout persists sanitized failure",async()=>{const p:MusicGenerationProvider={...musicProvider,generate:vi.fn(async()=>{throw new SoundProviderTimeoutError();})},s=db();expect(await processSoundJob({supabase:s,jobId:"job",claimToken:"claim",musicProvider:p})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_sound_generation",expect.objectContaining({p_error_code:"SOUND_PROVIDER_TIMEOUT"}));});
 it("refusal persists sanitized failure",async()=>{const p:MusicGenerationProvider={...musicProvider,generate:vi.fn(async()=>{throw new SoundProviderRefusalError();})},s=db();expect(await processSoundJob({supabase:s,jobId:"job",claimToken:"claim",musicProvider:p})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_sound_generation",expect.objectContaining({p_error_code:"SOUND_GENERATION_DECLINED"}));});
 it("heartbeat renews lease",async()=>{vi.useFakeTimers();let resolve!:(value:GeneratedSoundAudio)=>void;const p:MusicGenerationProvider={...musicProvider,generate:vi.fn(()=>new Promise<GeneratedSoundAudio>(r=>{resolve=r;}))},s=db();const work=processSoundJob({supabase:s,jobId:"job",claimToken:"claim",musicProvider:p});await vi.advanceTimersByTimeAsync(46000);expect(s.rpc).toHaveBeenCalledWith("renew_sound_generation_lease",expect.anything());resolve(audio);await vi.runAllTimersAsync();await work;});
 it("lost lease prevents commit",async()=>{vi.useFakeTimers();let resolve!:(value:GeneratedSoundAudio)=>void;const p:MusicGenerationProvider={...musicProvider,generate:vi.fn(()=>new Promise<GeneratedSoundAudio>(r=>{resolve=r;}))},s=db({renew:false});const work=processSoundJob({supabase:s,jobId:"job",claimToken:"claim",musicProvider:p});await vi.advanceTimersByTimeAsync(46000);resolve(audio);await vi.runAllTimersAsync();expect(await work).toBe("STALE");});
 it("logs do not include prompts",async()=>{const spy=vi.spyOn(console,"info").mockImplementation(()=>{});await processSoundJob({supabase:db(),jobId:"job",claimToken:"claim",musicProvider});expect(JSON.stringify(spy.mock.calls)).not.toContain(compiled.prompt);});
});
