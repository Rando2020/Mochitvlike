import {beforeEach,describe,expect,it,vi} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "../compileStoryboardBlueprint";
import {buildStoryboardPanelPrompt} from "../images/buildStoryboardPanelPrompt";

vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/scenes/persistence/getScene",()=>({getScene:vi.fn()}));
vi.mock("@/lib/scripts/persistence/getScript",()=>({getScript:vi.fn()}));
vi.mock("@/lib/visual-planning/persistence/getVisualPlan",()=>({getVisualPlan:vi.fn()}));
vi.mock("../storage",()=>({uploadStoryboardPanel:vi.fn(),removeStoryboardPanel:vi.fn()}));

import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {uploadStoryboardPanel,removeStoryboardPanel} from "../storage";
import {processStoryboardPanelJob} from "../jobs/processStoryboardPanelJob";

const seriesId="22222222-2222-4222-8222-222222222222",scene=buildValidScene(),script=buildValidScript(),visualPlan=buildValidVisualPlan(),storyboardId="66666666-6666-4666-8666-666666666666";
const compiled=compileStoryboardBlueprint({storyboardId,seriesId,sceneId:scene.id,scriptId:script.id,visualPlanId:visualPlan.id,version:1,series:theWoundsWeKeep,scene,script,visualPlan});
const panel=compiled.blueprint.panels[0], checksum=buildStoryboardPanelPrompt(compiled.specs[0]).promptChecksum;

function fakeSupabase(opts:{complete?:boolean;jobStatus?:string;claimToken?:string}={}){
 let status=opts.jobStatus??"GENERATING"; const currentClaim=opts.claimToken??"claim";
 const rpc=vi.fn(async(name:string)=>{
  if(name==="renew_storyboard_panel_generation_lease")return{data:status==="GENERATING",error:null};
  if(name==="complete_storyboard_panel_generation"){if(opts.complete===false)return{data:false,error:null};status="COMPLETED";return{data:true,error:null};}
  if(name==="fail_storyboard_panel_generation"){status="FAILED";return{data:true,error:null};}
  return{data:null,error:null};
 });
 return{
  rpc,
  from:(table:string)=>{
   const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>table==="storyboard_panel_generations"?{data:{id:"job",storyboard_id:storyboardId,panel_id:panel.id,creator_id:"user",status,prompt_checksum:checksum,attempt_id:"77777777-7777-4777-8777-777777777777",claim_token:currentClaim},error:null}:{data:{id:storyboardId,series_id:seriesId,scene_id:scene.id,script_id:script.id,visual_plan_id:visualPlan.id,creator_id:"user",blueprint:compiled.blueprint},error:null}};
   return chain;
  }
 } as any;
}
const provider={name:"test",model:"test",generate:vi.fn(async()=>({bytes:new Uint8Array([137,80,78,71]),mimeType:"image/png" as const,width:1536,height:1024,provider:"test",model:"test"}))};

beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(getSeries).mockResolvedValue({blueprint:theWoundsWeKeep} as any);
 vi.mocked(getScene).mockResolvedValue({blueprint:scene} as any);
 vi.mocked(getScript).mockResolvedValue({script} as any);
 vi.mocked(getVisualPlan).mockResolvedValue({plan:visualPlan} as any);
 vi.mocked(uploadStoryboardPanel).mockResolvedValue({storagePath:"path.png",url:"https://asset"});
});

describe("processStoryboardPanelJob",()=>{
 it("generates and commits a valid claimed panel",async()=>expect(await processStoryboardPanelJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider})).toBe("COMPLETED"));
 it("invokes provider once",async()=>{await processStoryboardPanelJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("duplicate delivery after completion does not invoke provider twice",async()=>{const s=fakeSupabase();await processStoryboardPanelJob({supabase:s,jobId:"job",claimToken:"claim",provider});await processStoryboardPanelJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("stale initial job performs no provider work",async()=>{expect(await processStoryboardPanelJob({supabase:fakeSupabase({jobStatus:"COMPLETED"}),jobId:"job",claimToken:"claim",provider})).toBe("STALE");expect(provider.generate).not.toHaveBeenCalled();});
 it("old claim token performs no provider work after takeover",async()=>{expect(await processStoryboardPanelJob({supabase:fakeSupabase({claimToken:"new-claim"}),jobId:"job",claimToken:"old-claim",provider})).toBe("STALE");expect(provider.generate).not.toHaveBeenCalled();});
 it("rejected stale completion removes uploaded object",async()=>{expect(await processStoryboardPanelJob({supabase:fakeSupabase({complete:false}),jobId:"job",claimToken:"claim",provider})).toBe("STALE");expect(removeStoryboardPanel).toHaveBeenCalledWith(expect.anything(),"path.png");});
 it("provider failure is sanitized through fail RPC",async()=>{const bad={...provider,generate:vi.fn(async()=>{throw new Error("secret provider body")})};const s=fakeSupabase();expect(await processStoryboardPanelJob({supabase:s,jobId:"job",claimToken:"claim",provider:bad})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_storyboard_panel_generation",expect.objectContaining({p_error_code:"INTERNAL_TRANSIENT"}));});
 it("storage failure becomes FAILED",async()=>{vi.mocked(uploadStoryboardPanel).mockRejectedValueOnce(new Error("STORYBOARD_STORAGE_FAILED"));expect(await processStoryboardPanelJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider})).toBe("FAILED");});
 it("never persists plaintext prompt",async()=>{const s=fakeSupabase();await processStoryboardPanelJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(JSON.stringify(s.rpc.mock.calls)).not.toContain("Create one high-quality production storyboard");});
});