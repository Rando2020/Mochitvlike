import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/dialogue-audio/persistence",()=>({getDialogueAudioPlan:vi.fn(),getDialogueLineStates:vi.fn(),getVoiceCast:vi.fn(),materializeDialogueAudioPlan:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getDialogueAudioPlan,getDialogueLineStates,getVoiceCast,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {buildValidDialogue} from "@/lib/dialogue-audio/__tests__/fixtures";
import {GET} from "../[dialoguePlanId]/route";
import {POST as RETRY} from "../[dialoguePlanId]/lines/[lineId]/retry/route";

const f=buildValidDialogue(),ids={seriesId:f.plan.seriesId,assemblyId:f.plan.episodeAssemblyId,dialoguePlanId:f.plan.id};
function client(job:any=null,rpc={data:true,error:null}){const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:job,error:null})};return{auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})},from:()=>chain,rpc:vi.fn(async()=>rpc)} as any;}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue(client());
 vi.mocked(getDialogueAudioPlan).mockResolvedValue({id:f.plan.id,series_id:f.plan.seriesId,episode_assembly_id:f.plan.episodeAssemblyId,voice_cast_id:f.voiceCast.id,status:"GENERATING",version:1,plan:f.plan} as any);
 vi.mocked(getVoiceCast).mockResolvedValue({cast:f.voiceCast} as any);vi.mocked(getDialogueLineStates).mockResolvedValue([]);vi.mocked(materializeDialogueAudioPlan).mockReturnValue(f.plan);
});
describe("Dialogue status/retry",()=>{
 it("status returns owned plan",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(200));
 it("status includes AI disclosure",async()=>{const b=await(await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).json();expect(b.dialogue.aiVoiceDisclosure).toMatch(/AI-generated/);});
 it("status hides claims and credentials",async()=>{const b=JSON.stringify(await(await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).json());expect(b).not.toMatch(/claim_token|lease_expires_at|OPENAI_API_KEY/);});
 it("status returns 404 on foreign parent path",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve({...ids,seriesId:"other"})})).status).toBe(404));
 it("status returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("retries failed line",async()=>{const line=f.plan.lines[0];vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"job",status:"FAILED",retry_count:0,dialogue_audio_plans:{series_id:ids.seriesId,episode_assembly_id:ids.assemblyId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,lineId:line.id})})).status).toBe(202);});
 it("does not retry completed line",async()=>{const line=f.plan.lines[0];vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"job",status:"COMPLETED",retry_count:0,dialogue_audio_plans:{series_id:ids.seriesId,episode_assembly_id:ids.assemblyId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,lineId:line.id})})).status).toBe(409);});
 it("foreign retry returns 404",async()=>{const line=f.plan.lines[0];vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"job",status:"FAILED",retry_count:0,dialogue_audio_plans:{series_id:"other",episode_assembly_id:ids.assemblyId,creator_id:"u"}}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({...ids,lineId:line.id})})).status).toBe(404);});
});
