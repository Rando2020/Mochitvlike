import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/episodes/assembly/persistence",()=>({getEpisodeAssembly:vi.fn()}));
vi.mock("@/lib/dialogue-audio/persistence",()=>({getDialogueAudioPlan:vi.fn(),getDialogueLineStates:vi.fn(),materializeDialogueAudioPlan:vi.fn()}));
vi.mock("@/lib/sound-design/persistence",()=>({getSoundDesignPlan:vi.fn(),getSoundCueStates:vi.fn(),materializeSoundDesignPlan:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getDialogueAudioPlan,getDialogueLineStates,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {getSoundDesignPlan,getSoundCueStates,materializeSoundDesignPlan} from "@/lib/sound-design/persistence";
import {buildValidSound} from "@/lib/sound-design/__tests__/fixtures";
import {GET} from "../[soundPlanId]/route";
import {POST as RETRY} from "../[soundPlanId]/cues/[cueId]/retry/route";

const f=buildValidSound(),ids={seriesId:f.soundPlan.seriesId,assemblyId:f.soundPlan.episodeAssemblyId,dialoguePlanId:f.soundPlan.dialoguePlanId!,soundPlanId:f.soundPlan.id};
function client(job:any=null,rpc={data:true,error:null}){const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:job,error:null})};return{auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})},from:()=>chain,rpc:vi.fn(async()=>rpc)} as any;}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue(client());
 vi.mocked(getEpisodeAssembly).mockResolvedValue({series_id:ids.seriesId,timeline:f.episodeTimeline} as any);
 vi.mocked(getDialogueAudioPlan).mockResolvedValue({id:ids.dialoguePlanId,episode_assembly_id:ids.assemblyId,plan:f.plan} as any);vi.mocked(getDialogueLineStates).mockResolvedValue([]);vi.mocked(materializeDialogueAudioPlan).mockReturnValue(f.plan);
 vi.mocked(getSoundDesignPlan).mockResolvedValue({id:ids.soundPlanId,series_id:ids.seriesId,episode_assembly_id:ids.assemblyId,dialogue_plan_id:ids.dialoguePlanId,status:"GENERATING",version:1,plan:f.soundPlan} as any);
 vi.mocked(getSoundCueStates).mockResolvedValue([]);vi.mocked(materializeSoundDesignPlan).mockReturnValue(f.soundPlan);
});
describe("Sound status and retry",()=>{
 it("returns owned plan",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(200));
 it("returns mix tracks",async()=>{const b=await(await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).json();expect(Object.keys(b.sound.mix.tracks)).toEqual(["dialogue","music","ambience","effects"]);});
 it("hides claim/provider credentials",async()=>{const b=JSON.stringify(await(await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).json());expect(b).not.toMatch(/claim_token|lease_expires_at|ELEVENLABS_API_KEY/);});
 it("returns 404 for cross-series path",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve({...ids,seriesId:"other"})})).status).toBe(404));
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("retries only failed cue",async()=>{const cue=f.soundPlan.cues.find(c=>c.type!=="SILENCE")!;vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"FAILED",retry_count:0,sound_design_plans:{series_id:ids.seriesId,episode_assembly_id:ids.assemblyId,dialogue_plan_id:ids.dialoguePlanId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,cueId:cue.id})})).status).toBe(202);});
 it("does not retry completed cue",async()=>{const cue=f.soundPlan.cues.find(c=>c.type!=="SILENCE")!;vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"COMPLETED",retry_count:0,sound_design_plans:{series_id:ids.seriesId,episode_assembly_id:ids.assemblyId,dialogue_plan_id:ids.dialoguePlanId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,cueId:cue.id})})).status).toBe(409);});
 it("cross-user-like parent mismatch returns 404",async()=>{const cue=f.soundPlan.cues.find(c=>c.type!=="SILENCE")!;vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"FAILED",retry_count:0,sound_design_plans:{series_id:"other",episode_assembly_id:ids.assemblyId,dialogue_plan_id:ids.dialoguePlanId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,cueId:cue.id})})).status).toBe(404);});
});
