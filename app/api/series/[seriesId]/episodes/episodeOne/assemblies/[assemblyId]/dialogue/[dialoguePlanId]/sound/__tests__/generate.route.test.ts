import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/sound-design/loadSoundContext",()=>({loadSoundContext:vi.fn()}));
vi.mock("@/lib/sound-design/persistence",()=>({getLatestSoundDesignPlan:vi.fn()}));
vi.mock("@/lib/sound-design/library",()=>({EnvironmentSoundLibraryProvider:class{resolve=vi.fn(async()=>null);}}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {loadSoundContext} from "@/lib/sound-design/loadSoundContext";
import {getLatestSoundDesignPlan} from "@/lib/sound-design/persistence";
import {buildValidSound} from "@/lib/sound-design/__tests__/fixtures";
import {POST} from "../generate/route";

const f=buildValidSound(),ids={seriesId:f.episodeTimeline.seriesId,assemblyId:f.episodeTimeline.id,dialoguePlanId:f.plan.id};
const req=(b:any={mode:"INITIAL"})=>new NextRequest("http://x",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
const user=(id:string|null)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})}}) as any;
const admin=(result:any={data:true,error:null})=>({rpc:vi.fn(async()=>result)}) as any;
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue(user("u"));vi.mocked(createAdminSupabaseClient).mockReturnValue(admin());
 vi.mocked(loadSoundContext).mockResolvedValue({series:f.series,assembly:{timeline:f.episodeTimeline},dialogueRow:{status:"READY"},dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}]} as any);
 vi.mocked(getLatestSoundDesignPlan).mockResolvedValue(null);
});
describe("POST sound generate",()=>{
 it("creates v1 and returns before providers complete",async()=>expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(202));
 it("uses atomic creation RPC",async()=>{const a=admin();vi.mocked(createAdminSupabaseClient).mockReturnValue(a);await POST(req(),{params:Promise.resolve(ids)});expect(a.rpc).toHaveBeenCalledWith("create_sound_design_plan",expect.objectContaining({p_version:1}));});
 it("does not call generation provider in request",async()=>{await POST(req(),{params:Promise.resolve(ids)});expect(JSON.stringify(vi.mocked(createAdminSupabaseClient).mock.calls)).not.toContain("/v1/music");});
 it("reuses existing v1",async()=>{vi.mocked(getLatestSoundDesignPlan).mockResolvedValue({id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",status:"READY",version:1} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(200);});
 it("rejects actively generating dialogue",async()=>{vi.mocked(loadSoundContext).mockResolvedValue({dialogueRow:{status:"GENERATING"}} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(409);});
 it("rejects failed dialogue",async()=>{vi.mocked(loadSoundContext).mockResolvedValue({dialogueRow:{status:"FAILED"}} as any);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(409);});
 it("requires auth",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(user(null));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("rejects malformed request",async()=>expect((await POST(req({mode:"OTHER"}),{params:Promise.resolve(ids)})).status).toBe(400));
 it("hides arbitrary provider credentials in input",async()=>expect((await POST(req({mode:"INITIAL",apiKey:"x"}),{params:Promise.resolve(ids)})).status).toBe(400));
 it("returns controlled persistence failure",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue(admin({data:null,error:{code:"x"}}));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(500);});
});
