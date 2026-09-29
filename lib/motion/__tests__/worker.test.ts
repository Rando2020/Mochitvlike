import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/series/persistence/getSeries",()=>({getSeries:vi.fn()}));
vi.mock("@/lib/scenes/persistence/getScene",()=>({getScene:vi.fn()}));
vi.mock("@/lib/scripts/persistence/getScript",()=>({getScript:vi.fn()}));
vi.mock("@/lib/visual-planning/persistence/getVisualPlan",()=>({getVisualPlan:vi.fn()}));
vi.mock("@/lib/storyboards/persistence",()=>({getStoryboard:vi.fn(),getPanelStates:vi.fn(),materializeStoryboard:vi.fn()}));
vi.mock("@/lib/animatics/persistence",()=>({getAnimatic:vi.fn()}));
vi.mock("../storage",()=>({uploadMotionClip:vi.fn(),removeMotionClip:vi.fn()}));

import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {uploadMotionClip,removeMotionClip} from "../storage";
import {buildValidMotion} from "./fixtures";
import {buildMotionGenerationSpec} from "../buildMotionGenerationSpec";
import {buildMotionPrompt} from "../prompts/buildMotionPrompt";
import {mapTargetToRunwayDuration} from "../duration";
import {processMotionClipJob} from "../jobs/processMotionClipJob";
import {VideoProviderRefusalError,VideoProviderTimeoutError} from "../providers/errors";

const f=buildValidMotion();
const clip=f.plan.clips.find(c=>c.generationStatus==="PENDING")!;
const checksum=buildMotionPrompt(buildMotionGenerationSpec({series:f.series,scene:f.scene,visualPlan:f.visualPlan,storyboard:f.storyboard,motionPlan:f.plan,motionClipId:clip.id})).promptChecksum;

function fakeSupabase(opts:{status?:string;claim?:string;complete?:boolean;providerTaskId?:string|null}={}){
 let status=opts.status??"GENERATING",providerTaskId=opts.providerTaskId??null;
 const rpc=vi.fn(async(name:string,args:any)=>{
  if(name==="renew_motion_clip_generation_lease")return{data:status==="GENERATING",error:null};
  if(name==="set_motion_provider_task"){providerTaskId=args.p_provider_task_id;return{data:true,error:null};}
  if(name==="complete_motion_clip_generation"){if(opts.complete===false)return{data:false,error:null};status="COMPLETED";return{data:true,error:null};}
  if(name==="fail_motion_clip_generation"){status="FAILED";return{data:true,error:null};}
  return{data:null,error:null};
 });
 return{
  rpc,
  from:(table:string)=>{
   const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>{
    if(table==="motion_clip_generations")return{data:{id:"job",motion_plan_id:f.plan.id,motion_clip_id:clip.id,creator_id:"u",status,prompt_checksum:checksum,prompt_version:"1.0",provider:"runway",model:"gen4.5",provider_duration_seconds:mapTargetToRunwayDuration(clip.targetDurationSeconds),provider_task_id:providerTaskId,attempt_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",claim_token:opts.claim??"claim",started_at:new Date().toISOString()},error:null};
    if(table==="motion_plans")return{data:{id:f.plan.id,series_id:f.plan.seriesId,scene_id:f.plan.sceneId,script_id:f.plan.scriptId,visual_plan_id:f.plan.visualPlanId,storyboard_id:f.plan.storyboardId,animatic_id:f.plan.animaticId,creator_id:"u",plan:f.plan},error:null};
    return{data:null,error:null};
   }};
   return chain;
  }
 } as any;
}

const generated={bytes:new Uint8Array(2048),mimeType:"video/mp4" as const,durationSeconds:4,width:1280,height:720,provider:"test",model:"test",providerTaskId:"provider-task"};
const provider={name:"test",model:"test",generate:vi.fn(async(input:any)=>{if(input.onTaskCreated)await input.onTaskCreated("provider-task");return generated;})};

beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(getSeries).mockResolvedValue({blueprint:f.series} as any);
 vi.mocked(getScene).mockResolvedValue({blueprint:f.scene} as any);
 vi.mocked(getScript).mockResolvedValue({script:f.script} as any);
 vi.mocked(getVisualPlan).mockResolvedValue({plan:f.visualPlan} as any);
 vi.mocked(getStoryboard).mockResolvedValue({blueprint:f.storyboard} as any);
 vi.mocked(getPanelStates).mockResolvedValue([] as any);
 vi.mocked(materializeStoryboard).mockReturnValue(f.storyboard);
 vi.mocked(getAnimatic).mockResolvedValue({timeline:f.timeline} as any);
 vi.mocked(uploadMotionClip).mockResolvedValue({storagePath:"motion.mp4",url:"https://example.com/motion.mp4"});
});

describe("processMotionClipJob",()=>{
 it("completes a valid claim",async()=>expect(await processMotionClipJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider})).toBe("COMPLETED"));
 it("calls provider once",async()=>{await processMotionClipJob({supabase:fakeSupabase(),jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("duplicate delivery after completion performs no second provider call",async()=>{const s=fakeSupabase();await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider});await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(provider.generate).toHaveBeenCalledTimes(1);});
 it("stale claim performs zero provider calls",async()=>{expect(await processMotionClipJob({supabase:fakeSupabase({claim:"new"}),jobId:"job",claimToken:"old",provider})).toBe("STALE");expect(provider.generate).not.toHaveBeenCalled();});
 it("persists provider task id under current claim",async()=>{const s=fakeSupabase();await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(s.rpc).toHaveBeenCalledWith("set_motion_provider_task",expect.objectContaining({p_provider_task_id:"provider-task"}));});
 it("passes persisted provider task id to resume",async()=>{const p={...provider,generate:vi.fn(async(input:any)=>{expect(input.resumeTaskId).toBe("existing-task");return generated;})};await processMotionClipJob({supabase:fakeSupabase({providerTaskId:"existing-task"}),jobId:"job",claimToken:"claim",provider:p});expect(p.generate).toHaveBeenCalledTimes(1);});
 it("stale completion cleans uploaded attempt",async()=>{expect(await processMotionClipJob({supabase:fakeSupabase({complete:false}),jobId:"job",claimToken:"claim",provider})).toBe("STALE");expect(removeMotionClip).toHaveBeenCalledWith(expect.anything(),"motion.mp4");});
 it("provider refusal becomes sanitized FAILED",async()=>{const p={...provider,generate:vi.fn(async()=>{throw new VideoProviderRefusalError();})};const s=fakeSupabase();expect(await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider:p})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_motion_clip_generation",expect.objectContaining({p_error_code:"VIDEO_GENERATION_DECLINED"}));});
 it("timeout with persisted provider task defers instead of paying again",async()=>{const p={...provider,generate:vi.fn(async()=>{throw new VideoProviderTimeoutError();})};const s=fakeSupabase({providerTaskId:"existing-task"});expect(await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider:p})).toBe("DEFERRED");expect(s.rpc).not.toHaveBeenCalledWith("fail_motion_clip_generation",expect.anything());});
 it("storage failure is sanitized",async()=>{vi.mocked(uploadMotionClip).mockRejectedValueOnce(new Error("MOTION_STORAGE_FAILED"));const s=fakeSupabase();expect(await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider})).toBe("FAILED");expect(s.rpc).toHaveBeenCalledWith("fail_motion_clip_generation",expect.objectContaining({p_error_code:"MOTION_STORAGE_FAILED"}));});
 it("never persists plaintext prompt",async()=>{const s=fakeSupabase();await processMotionClipJob({supabase:s,jobId:"job",claimToken:"claim",provider});expect(JSON.stringify(s.rpc.mock.calls)).not.toContain("Generate one continuous image-to-video shot");});
});
