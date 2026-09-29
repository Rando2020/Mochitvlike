import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/scenes/persistence/getScene",()=>({getScene:vi.fn()}));
vi.mock("@/lib/scripts/persistence/getScript",()=>({getScript:vi.fn()}));
vi.mock("@/lib/visual-planning/persistence/getVisualPlan",()=>({getVisualPlan:vi.fn()}));
vi.mock("@/lib/storyboards/persistence",()=>({getStoryboard:vi.fn(),getPanelStates:vi.fn(),materializeStoryboard:vi.fn()}));
vi.mock("@/lib/animatics/persistence",()=>({getAnimatic:vi.fn()}));
vi.mock("@/lib/motion/persistence",()=>({getMotionPlan:vi.fn(),getMotionClipStates:vi.fn(),materializeMotionPlan:vi.fn()}));
vi.mock("@/lib/episodes/assembly/persistence",()=>({getLatestEpisodeAssembly:vi.fn()}));

import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {getMotionPlan,getMotionClipStates,materializeMotionPlan} from "@/lib/motion/persistence";
import {getLatestEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {buildReadyEpisodeSources} from "@/lib/episodes/assembly/__tests__/fixtures";
import {POST} from "../generate/route";

const f=buildReadyEpisodeSources(),seriesId=f.motionPlan.seriesId;
const req=(body:any={mode:"INITIAL",motionPlanIds:[f.motionPlan.id]})=>new NextRequest("http://x",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const user=(id:string|null)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})}}) as any;
const admin=(result:any={data:true,error:null})=>({rpc:vi.fn(async()=>result)}) as any;

beforeEach(()=>{
 vi.resetAllMocks();
 vi.mocked(createServerSupabaseClient).mockResolvedValue(user("u"));vi.mocked(createAdminSupabaseClient).mockReturnValue(admin());
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);vi.mocked(getScene).mockResolvedValue({blueprint:f.scene} as any);
 vi.mocked(getScript).mockResolvedValue({script:f.script} as any);vi.mocked(getVisualPlan).mockResolvedValue({plan:f.visualPlan} as any);
 vi.mocked(getStoryboard).mockResolvedValue({blueprint:f.storyboard} as any);vi.mocked(getPanelStates).mockResolvedValue([] as any);
 vi.mocked(materializeStoryboard).mockReturnValue(f.storyboard);vi.mocked(getAnimatic).mockResolvedValue({timeline:f.timeline} as any);
 vi.mocked(getMotionPlan).mockResolvedValue({id:f.motionPlan.id,series_id:seriesId,scene_id:f.motionPlan.sceneId,script_id:f.motionPlan.scriptId,visual_plan_id:f.motionPlan.visualPlanId,storyboard_id:f.motionPlan.storyboardId,animatic_id:f.motionPlan.animaticId,status:"READY",plan:f.motionPlan} as any);
 vi.mocked(getMotionClipStates).mockResolvedValue([]);vi.mocked(materializeMotionPlan).mockReturnValue(f.motionPlan);
 vi.mocked(getLatestEpisodeAssembly).mockResolvedValue(null);
});
describe("POST Episode Assembly generate",()=>{
 it("creates v1 from READY MotionPlan",async()=>expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(201));
 it("reuses existing v1",async()=>{vi.mocked(getLatestEpisodeAssembly).mockResolvedValue({id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",status:"READY",version:1,timeline:{} as any,preview:null} as any);expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(200);});
 it("rejects PARTIAL MotionPlan",async()=>{vi.mocked(getMotionPlan).mockResolvedValue({id:f.motionPlan.id,series_id:seriesId,status:"PARTIAL",plan:f.motionPlan} as any);expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(409);});
 it("rejects unauthenticated request",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(user(null));expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(401);});
 it("rejects foreign MotionPlan",async()=>{vi.mocked(getMotionPlan).mockResolvedValue({id:f.motionPlan.id,series_id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",status:"READY",plan:f.motionPlan} as any);expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(404);});
 it("rejects malformed request",async()=>expect((await POST(req({mode:"INITIAL",motionPlanIds:[]}),{params:Promise.resolve({seriesId})})).status).toBe(400));
 it("does not call media generation provider",async()=>{await POST(req(),{params:Promise.resolve({seriesId})});expect(JSON.stringify(vi.mocked(createAdminSupabaseClient).mock.calls)).not.toContain("runway");});
 it("persistence failure is controlled",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue(admin({data:null,error:{code:"x"}}));expect((await POST(req(),{params:Promise.resolve({seriesId})})).status).toBe(500);});
});
