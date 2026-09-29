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
vi.mock("@/lib/motion/persistence",()=>({getLatestMotionPlan:vi.fn(),getMotionClipStates:vi.fn()}));

import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {getLatestMotionPlan,getMotionClipStates} from "@/lib/motion/persistence";
import {buildValidMotion} from "@/lib/motion/__tests__/fixtures";
import {POST} from "../generate/route";

const f=buildValidMotion();
const ids={seriesId:f.plan.seriesId,sceneId:f.plan.sceneId,scriptId:f.plan.scriptId,planId:f.plan.visualPlanId,storyboardId:f.plan.storyboardId,animaticId:f.plan.animaticId};
const req=(body:any={mode:"INITIAL"})=>new NextRequest("http://x",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const user=(id:string|null)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})}}) as any;
const admin=(result:any={data:true,error:null})=>({rpc:vi.fn(async()=>result)}) as any;

beforeEach(()=>{
 vi.resetAllMocks();
 vi.mocked(createServerSupabaseClient).mockResolvedValue(user("u"));vi.mocked(createAdminSupabaseClient).mockReturnValue(admin());
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);vi.mocked(getScene).mockResolvedValue({blueprint:f.scene} as any);
 vi.mocked(getScript).mockResolvedValue({script:f.script} as any);vi.mocked(getVisualPlan).mockResolvedValue({plan:f.visualPlan} as any);
 vi.mocked(getStoryboard).mockResolvedValue({series_id:ids.seriesId,scene_id:ids.sceneId,script_id:ids.scriptId,visual_plan_id:ids.planId,blueprint:f.storyboard} as any);
 vi.mocked(getPanelStates).mockResolvedValue([] as any);vi.mocked(materializeStoryboard).mockReturnValue(f.storyboard);
 vi.mocked(getAnimatic).mockResolvedValue({storyboardId:ids.storyboardId,timeline:f.timeline} as any);
 vi.mocked(getLatestMotionPlan).mockResolvedValue(null);vi.mocked(getMotionClipStates).mockResolvedValue([]);
});

describe("POST motion generation",()=>{
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(user(null));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("rejects malformed body",async()=>expect((await POST(req({mode:"OTHER"}),{params:Promise.resolve(ids)})).status).toBe(400));
 it("returns 404 for invalid IDs",async()=>expect((await POST(req(),{params:Promise.resolve({...ids,animaticId:"bad"})})).status).toBe(404));
 it("returns 202 after atomic durable acceptance",async()=>expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(202));
 it("does not wait on video provider",async()=>{await POST(req(),{params:Promise.resolve(ids)});expect(JSON.stringify(vi.mocked(createAdminSupabaseClient).mock.calls)).not.toContain("image_to_video");});
 it("reuses existing plan",async()=>{vi.mocked(getLatestMotionPlan).mockResolvedValue({id:f.plan.id,status:"GENERATING",plan:f.plan} as any);vi.mocked(getMotionClipStates).mockResolvedValue([]);expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(202);});
 it("queue transaction failure returns 503",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue(admin({data:null,error:{code:"x"}}));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(503);});
 it("foreign parent returns 404",async()=>{vi.mocked(getSeries).mockRejectedValue(new Error("missing"));expect((await POST(req(),{params:Promise.resolve(ids)})).status).toBe(404);});
});
