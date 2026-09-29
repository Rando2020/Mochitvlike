import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/scenes/persistence/getScene",()=>({getScene:vi.fn()}));
vi.mock("@/lib/scripts/persistence/getScript",()=>({getScript:vi.fn()}));
vi.mock("@/lib/visual-planning/persistence/getVisualPlan",()=>({getVisualPlan:vi.fn()}));
vi.mock("@/lib/storyboards/persistence",()=>({getStoryboard:vi.fn(),getPanelStates:vi.fn(),materializeStoryboard:vi.fn()}));
vi.mock("@/lib/animatics/persistence",()=>({getAnimatic:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {buildValidAnimatic} from "@/lib/animatics/__tests__/fixtures";
import {GET} from "../[animaticId]/route";
const f=buildValidAnimatic(),ids={seriesId:f.timeline.seriesId,sceneId:f.timeline.sceneId,scriptId:f.timeline.scriptId,planId:f.timeline.visualPlanId,storyboardId:f.timeline.storyboardId,animaticId:f.timeline.id};
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})}} as any);
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);vi.mocked(getScene).mockResolvedValue({blueprint:f.scene} as any);vi.mocked(getScript).mockResolvedValue({script:f.script} as any);vi.mocked(getVisualPlan).mockResolvedValue({plan:f.visualPlan} as any);vi.mocked(getStoryboard).mockResolvedValue({visual_plan_id:ids.planId,blueprint:f.storyboard} as any);vi.mocked(getPanelStates).mockResolvedValue([]);vi.mocked(materializeStoryboard).mockReturnValue(f.storyboard);vi.mocked(getAnimatic).mockResolvedValue({id:f.timeline.id,storyboardId:ids.storyboardId,status:"READY",version:1,timeline:f.timeline,preview:null} as any);
});
describe("GET Animatic",()=>{
 it("returns owned Animatic",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(200));
 it("does not expose provider credentials",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)});const t=JSON.stringify(await r.json());expect(t).not.toContain("OPENAI_API_KEY");expect(t).not.toContain("claim_token");});
 it("returns 404 foreign storyboard",async()=>{vi.mocked(getStoryboard).mockResolvedValue({visual_plan_id:"other",blueprint:f.storyboard} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(404);});
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(401);});
});
