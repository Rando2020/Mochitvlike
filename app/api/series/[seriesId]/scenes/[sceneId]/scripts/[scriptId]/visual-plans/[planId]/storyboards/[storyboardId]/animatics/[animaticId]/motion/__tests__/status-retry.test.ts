import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/motion/persistence",()=>({getMotionPlan:vi.fn(),getMotionClipStates:vi.fn(),materializeMotionPlan:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getMotionPlan,getMotionClipStates,materializeMotionPlan} from "@/lib/motion/persistence";
import {buildValidMotion} from "@/lib/motion/__tests__/fixtures";
import {GET} from "../[motionPlanId]/route";
import {POST as RETRY} from "../[motionPlanId]/clips/[motionClipId]/retry/route";

const f=buildValidMotion();
const ids={seriesId:f.plan.seriesId,sceneId:f.plan.sceneId,scriptId:f.plan.scriptId,planId:f.plan.visualPlanId,storyboardId:f.plan.storyboardId,animaticId:f.plan.animaticId,motionPlanId:f.plan.id};
function client(job:any=null,rpc={data:true,error:null}){const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:job,error:null})};return{auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})},from:()=>chain,rpc:vi.fn(async()=>rpc)} as any;}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue(client());
 vi.mocked(getMotionPlan).mockResolvedValue({id:f.plan.id,series_id:ids.seriesId,scene_id:ids.sceneId,script_id:ids.scriptId,visual_plan_id:ids.planId,storyboard_id:ids.storyboardId,animatic_id:ids.animaticId,status:"GENERATING",version:1,plan:f.plan} as any);
 vi.mocked(getMotionClipStates).mockResolvedValue([]);vi.mocked(materializeMotionPlan).mockReturnValue(f.plan);
});
describe("Motion status/retry",()=>{
 it("status returns safe plan state",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)});expect(r.status).toBe(200);const t=JSON.stringify(await r.json());expect(t).not.toContain("prompt_checksum");expect(t).not.toContain("claim_token");expect(t).not.toContain("lease_expires_at");});
 it("foreign path returns 404",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve({...ids,seriesId:"other"})})).status).toBe(404));
 it("unauthenticated status returns 401",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("retries FAILED clip",async()=>{const c=f.plan.clips[0];vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"job",status:"FAILED",retry_count:0}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({motionPlanId:f.plan.id,motionClipId:c.id})})).status).toBe(202);});
 it("does not retry successful clip",async()=>{const c=f.plan.clips[0];vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"job",status:"COMPLETED",retry_count:0}));expect((await RETRY(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve({motionPlanId:f.plan.id,motionClipId:c.id})})).status).toBe(409);});
});
