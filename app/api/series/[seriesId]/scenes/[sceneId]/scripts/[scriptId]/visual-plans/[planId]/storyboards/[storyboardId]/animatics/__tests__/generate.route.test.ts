import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/scenes/persistence/getScene",()=>({getScene:vi.fn()}));
vi.mock("@/lib/scripts/persistence/getScript",()=>({getScript:vi.fn()}));
vi.mock("@/lib/visual-planning/persistence/getVisualPlan",()=>({getVisualPlan:vi.fn()}));
vi.mock("@/lib/storyboards/persistence",()=>({getStoryboard:vi.fn(),getPanelStates:vi.fn(),materializeStoryboard:vi.fn()}));
vi.mock("@/lib/animatics/persistence",()=>({getLatestAnimatic:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getLatestAnimatic} from "@/lib/animatics/persistence";
import {buildValidAnimatic} from "@/lib/animatics/__tests__/fixtures";
import {POST} from "../generate/route";

const f=buildValidAnimatic();
const ids={seriesId:f.timeline.seriesId,sceneId:f.timeline.sceneId,scriptId:f.timeline.scriptId,planId:f.timeline.visualPlanId,storyboardId:f.timeline.storyboardId};
const request=(body:any={mode:"INITIAL"})=>new NextRequest("http://x",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const userClient=(id:string|null)=>({auth:{getUser:async()=>({data:{user:id?{id}:null},error:null})}}) as any;
const admin=(result:any={data:true,error:null})=>({rpc:vi.fn(async()=>result)}) as any;

beforeEach(()=>{
 vi.resetAllMocks();
 vi.mocked(createServerSupabaseClient).mockResolvedValue(userClient("u"));
 vi.mocked(createAdminSupabaseClient).mockReturnValue(admin());
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);
 vi.mocked(getScene).mockResolvedValue({blueprint:f.scene} as any);
 vi.mocked(getScript).mockResolvedValue({script:f.script} as any);
 vi.mocked(getVisualPlan).mockResolvedValue({plan:f.visualPlan} as any);
 vi.mocked(getStoryboard).mockResolvedValue({id:f.storyboard.id,series_id:ids.seriesId,scene_id:ids.sceneId,script_id:ids.scriptId,visual_plan_id:ids.planId,status:"READY",blueprint:f.storyboard} as any);
 vi.mocked(getPanelStates).mockResolvedValue([]);
 vi.mocked(materializeStoryboard).mockReturnValue(f.storyboard);
 vi.mocked(getLatestAnimatic).mockResolvedValue(null);
});

describe("POST Animatic generate",()=>{
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(userClient(null));expect((await POST(request(),{params:Promise.resolve(ids)})).status).toBe(401);});
 it("rejects malformed request",async()=>expect((await POST(request({mode:"OTHER"}),{params:Promise.resolve(ids)})).status).toBe(400));
 it("rejects invalid parent UUID",async()=>expect((await POST(request(),{params:Promise.resolve({...ids,planId:"bad"})})).status).toBe(404));
 it("creates v1",async()=>{const r=await POST(request(),{params:Promise.resolve(ids)});expect(r.status).toBe(201);const b=await r.json();expect(b.animatic.version).toBe(1);});
 it("reuses existing Animatic",async()=>{vi.mocked(getLatestAnimatic).mockResolvedValue({id:f.timeline.id,status:"READY",version:1,timeline:f.timeline,preview:null} as any);expect((await POST(request(),{params:Promise.resolve(ids)})).status).toBe(200);});
 it("returns incomplete PARTIAL error",async()=>{const broken=structuredClone(f.storyboard);broken.panels[0].generationStatus="FAILED";broken.panels[0].asset=null;vi.mocked(getStoryboard).mockResolvedValue({id:f.storyboard.id,series_id:ids.seriesId,scene_id:ids.sceneId,script_id:ids.scriptId,visual_plan_id:ids.planId,status:"PARTIAL",blueprint:broken} as any);vi.mocked(materializeStoryboard).mockReturnValue(broken);const r=await POST(request(),{params:Promise.resolve(ids)});expect(r.status).toBe(409);});
 it("foreign parent returns 404",async()=>{vi.mocked(getSeries).mockRejectedValue(new Error("missing"));expect((await POST(request(),{params:Promise.resolve(ids)})).status).toBe(404);});
 it("persistence failure returns 500",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue(admin({data:null,error:{code:"x"}}));expect((await POST(request(),{params:Promise.resolve(ids)})).status).toBe(500);});
 it("does not call any video API",async()=>{await POST(request(),{params:Promise.resolve(ids)});expect(JSON.stringify(vi.mocked(createAdminSupabaseClient).mock.calls)).not.toContain("video");});
});
