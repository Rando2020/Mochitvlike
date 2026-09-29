import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {compileAnimaticTimeline,AnimaticCompileError} from "@/lib/animatics/compileAnimaticTimeline";
import {validateAnimaticTimeline} from "@/lib/animatics/validateAnimaticTimeline";
import {getLatestAnimatic} from "@/lib/animatics/persistence";

const Body=z.object({mode:z.literal("INITIAL")}).strict();
const Uuid=z.string().uuid();
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status});

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId}=await params;
  if([seriesId,sceneId,scriptId,planId,storyboardId].some(id=>!Uuid.safeParse(id).success))return fail(404,"ANIMATIC_PARENT_NOT_FOUND");
  let json:unknown;try{json=await request.json();}catch{return fail(400,"INVALID_ANIMATIC_REQUEST");}
  if(!Body.safeParse(json).success)return fail(400,"INVALID_ANIMATIC_REQUEST");

  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail(401,"UNAUTHENTICATED");

  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
    const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
    const visualPlan=await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);
    const storyboardRow=await getStoryboard(supabase,user.id,storyboardId);
    if(storyboardRow.series_id!==seriesId||storyboardRow.scene_id!==sceneId||storyboardRow.script_id!==scriptId||storyboardRow.visual_plan_id!==planId)return fail(404,"ANIMATIC_PARENT_NOT_FOUND");

    const existing=await getLatestAnimatic(supabase,user.id,storyboardId);
    if(existing)return NextResponse.json({animatic:{id:existing.id,status:existing.status,version:existing.version,timeline:existing.timeline,preview:existing.preview}},{status:200});

    const states=await getPanelStates(supabase,user.id,storyboardId);
    const storyboard=materializeStoryboard(storyboardRow.blueprint,states);
    const animaticId=randomUUID();
    const timeline=compileAnimaticTimeline({
      animaticId,version:1,series:series.blueprint,scene:scene.blueprint,script:script.script,visualPlan:visualPlan.plan,
      storyboard,storyboardStatus:storyboardRow.status
    });
    const valid=validateAnimaticTimeline(timeline,script.script,visualPlan.plan,storyboard,{
      animaticId,seriesId,sceneId,scriptId,visualPlanId:planId,storyboardId,version:1
    });
    if(!valid.success)return fail(422,"ANIMATIC_VALIDATION_FAILED");

    const admin=createAdminSupabaseClient();
    const {data:created,error:createError}=await admin.rpc("create_scene_animatic",{
      p_animatic_id:animaticId,p_creator_id:user.id,p_series_id:seriesId,p_scene_id:sceneId,p_script_id:scriptId,
      p_visual_plan_id:planId,p_storyboard_id:storyboardId,p_version:1,p_timeline:timeline
    });
    if(createError)return fail(500,"ANIMATIC_PERSISTENCE_FAILED");
    if(created!==true){
      const raced=await getLatestAnimatic(supabase,user.id,storyboardId);
      if(!raced)return fail(409,"ANIMATIC_PERSISTENCE_RACE");
      return NextResponse.json({animatic:{id:raced.id,status:raced.status,version:raced.version,timeline:raced.timeline,preview:raced.preview}},{status:200});
    }

    return NextResponse.json({animatic:{id:animaticId,status:"READY",version:1,timeline,preview:null}},{status:201});
  }catch(error){
    if(error instanceof AnimaticCompileError){
      return fail(error.code==="ANIMATIC_STORYBOARD_INCOMPLETE"?409:422,error.code);
    }
    return fail(404,"ANIMATIC_PARENT_NOT_FOUND");
  }
}
