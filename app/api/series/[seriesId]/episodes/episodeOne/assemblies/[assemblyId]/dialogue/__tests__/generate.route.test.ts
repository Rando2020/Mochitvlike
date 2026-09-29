import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/episodes/assembly/persistence",()=>({getEpisodeAssembly:vi.fn()}));
vi.mock("@/lib/dialogue-audio/persistence",()=>({getLatestDialogueAudioPlan:vi.fn(),getVoiceCast:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getLatestDialogueAudioPlan,getVoiceCast} from "@/lib/dialogue-audio/persistence";
import {buildValidDialogue} from "@/lib/dialogue-audio/__tests__/fixtures";
import {POST} from "../generate/route";

const f=buildValidDialogue(),ids={seriesId:f.episodeTimeline.seriesId,assemblyId:f.episodeTimeline.id};
const req=(body:any={mode:"INITIAL"})=>new NextRequest("http://x",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const user=(id:string|null)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})}}) as any;
const admin=(result:any={data:true,error:null})=>({rpc:vi.fn(async()=>result)}) as any;
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue(user("u"));vi.mocked(createAdminSupabaseClient).mockReturnValue(admin());
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);
 vi.mocked(getEpisodeAssembly).mockResolvedValue({id:ids.assemblyId,series_id:ids.seriesId,episode_key:"episodeOne",status:"READY",timeline:f.episodeTimeline} as any);
 vi.mocked(getLatestDialogueAudioPlan).mockResolvedValue(null);
});
describe("POST dialogue generate",()=>{
 it("returns 202 for new durable plan",async()=>expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(202));
 it("calls atomic creation RPC",async()=>{const a=admin();vi.mocked(createAdminSupabaseClient).mockReturnValue(a);await POST(req(),{params:Promise.resolve(ids)});expect(a.rpc).toHaveBeenCalledWith("create_dialogue_audio_plan",expect.objectContaining({p_version:1}));});
 it("returns existing plan without rebuilding",async()=>{vi.mocked(getLatestDialogueAudioPlan).mockResolvedValue({id:f.plan.id,status:"READY",version:1,voice_cast_id:f.voiceCast.id} as any);vi.mocked(getVoiceCast).mockResolvedValue({cast:f.voiceCast} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(200);});
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(user(null));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("returns 404 for foreign assembly series",async()=>{vi.mocked(getEpisodeAssembly).mockResolvedValue({series_id:"other",episode_key:"episodeOne",status:"READY",timeline:f.episodeTimeline} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(404);});
 it("rejects episode with no dialogue",async()=>{const t=structuredClone(f.episodeTimeline);t.scenes.forEach(s=>s.clips.forEach(c=>c.dialogueCues=[]));vi.mocked(getEpisodeAssembly).mockResolvedValue({series_id:ids.seriesId,episode_key:"episodeOne",status:"READY",timeline:t} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(422);});
 it("rejects invalid body",async()=>expect((await POST(req({mode:"OTHER"}),{params:Promise.resolve(ids)})).status).toBe(400));
 it("returns controlled persistence failure",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue(admin({data:null,error:{code:"x"}}));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(500);});
 it("does not wait on TTS provider",async()=>{await POST(req(),{params:Promise.resolve(ids)});expect(JSON.stringify(vi.mocked(createAdminSupabaseClient).mock.calls)).not.toContain("audio.speech");});
 it("does not accept client voice credentials",async()=>expect((await POST(req({mode:"INITIAL",apiKey:"secret",voice:"coral"}),{params:Promise.resolve(ids)})).status).toBe(400));
});
