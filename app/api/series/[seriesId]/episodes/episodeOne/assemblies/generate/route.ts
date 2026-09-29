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
import {getAnimatic} from "@/lib/animatics/persistence";
import {getMotionPlan,getMotionClipStates,materializeMotionPlan} from "@/lib/motion/persistence";
import {compileEpisodeTimeline,type EpisodeAssemblySceneInput,EpisodeAssemblyError} from "@/lib/episodes/assembly/compileEpisodeTimeline";
import {validateEpisodeTimeline} from "@/lib/episodes/assembly/validateEpisodeTimeline";
import {getLatestEpisodeAssembly} from "@/lib/episodes/assembly/persistence";

const Body=z.object({mode:z.literal("INITIAL"),motionPlanIds:z.array(z.string().uuid()).min(1).max(20)}).strict();
const Uuid=z.string().uuid();
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status});

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string}>}){
  const {seriesId}=await params;
  if(!Uuid.safeParse(seriesId).success)return fail(404,"EPISODE_SERIES_NOT_FOUND");
  let json:unknown;try{json=await request.json();}catch{return fail(400,"INVALID_EPISODE_ASSEMBLY_REQUEST");}
  const parsed=Body.safeParse(json);if(!parsed.success)return fail(400,"INVALID_EPISODE_ASSEMBLY_REQUEST");

  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail(401,"UNAUTHENTICATED");

  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const requestedMotionRows=[];
    for(const motionPlanId of parsed.data.motionPlanIds){
      const motionRow=await getMotionPlan(supabase,user.id,motionPlanId);
      if(motionRow.series_id!==seriesId)return fail(404,"EPISODE_MOTION_PLAN_NOT_FOUND");
      if(motionRow.status!=="READY")return fail(409,"EPISODE_MOTION_INCOMPLETE");
      requestedMotionRows.push(motionRow);
    }

    const existing=await getLatestEpisodeAssembly(supabase,user.id,seriesId,"episodeOne");
    if(existing)return NextResponse.json({episodeAssembly:{id:existing.id,status:existing.status,version:existing.version,timeline:existing.timeline,preview:existing.preview}},{status:200});

    const bundles:EpisodeAssemblySceneInput[]=[];
    for(const [order,motionRow] of requestedMotionRows.entries()){
      const motionPlanId=motionRow.id;
      const motionPlan=materializeMotionPlan(motionRow.plan,await getMotionClipStates(supabase,user.id,motionPlanId));
      if(motionPlan.clips.some(c=>c.generationStatus!=="COMPLETED"&&c.generationStatus!=="SKIPPED"))return fail(409,"EPISODE_MOTION_INCOMPLETE");

      const scene=await getScene(supabase,user.id,seriesId,motionRow.scene_id,series.blueprint);
      const script=await getScript(supabase,user.id,seriesId,motionRow.scene_id,motionRow.script_id,series.blueprint,scene.blueprint);
      const visualPlan=await getVisualPlan(supabase,user.id,seriesId,motionRow.scene_id,motionRow.script_id,motionRow.visual_plan_id,series.blueprint,scene.blueprint,script.script);
      const storyboardRow=await getStoryboard(supabase,user.id,motionRow.storyboard_id);
      const storyboard=materializeStoryboard(storyboardRow.blueprint,await getPanelStates(supabase,user.id,motionRow.storyboard_id));
      const animatic=await getAnimatic(supabase,user.id,motionRow.animatic_id,script.script,visualPlan.plan,storyboard);
      bundles.push({order,motionPlanStatus:motionRow.status,series:series.blueprint,scene:scene.blueprint,script:script.script,visualPlan:visualPlan.plan,storyboard,animatic:animatic.timeline,motionPlan});
    }

    const assemblyId=randomUUID();
    const timeline=compileEpisodeTimeline({assemblyId,seriesId,episodeKey:"episodeOne",version:1,scenes:bundles});
    const valid=validateEpisodeTimeline(timeline,bundles.map(b=>({sceneId:b.motionPlan.sceneId,script:b.script,animatic:b.animatic,motionPlan:b.motionPlan})),{
      assemblyId,seriesId,episodeKey:"episodeOne",version:1
    });
    if(!valid.success)return fail(422,"EPISODE_ASSEMBLY_VALIDATION_FAILED");

    const links=bundles.map(b=>({scene_id:b.motionPlan.sceneId,animatic_id:b.animatic.id,motion_plan_id:b.motionPlan.id,scene_order:b.order}));
    const admin=createAdminSupabaseClient();
    const {data:created,error:createError}=await admin.rpc("create_episode_assembly",{
      p_assembly_id:assemblyId,p_creator_id:user.id,p_series_id:seriesId,p_episode_key:"episodeOne",p_version:1,p_timeline:timeline,p_scenes:links
    });
    if(createError)return fail(500,"EPISODE_ASSEMBLY_PERSISTENCE_FAILED");
    if(created!==true){
      const raced=await getLatestEpisodeAssembly(supabase,user.id,seriesId,"episodeOne");
      if(!raced)return fail(409,"EPISODE_ASSEMBLY_PERSISTENCE_RACE");
      return NextResponse.json({episodeAssembly:{id:raced.id,status:raced.status,version:raced.version,timeline:raced.timeline,preview:raced.preview}},{status:200});
    }

    return NextResponse.json({episodeAssembly:{id:assemblyId,status:"READY",version:1,timeline,preview:null}},{status:201});
  }catch(error){
    if(error instanceof EpisodeAssemblyError)return fail(error.code==="EPISODE_MOTION_INCOMPLETE"?409:422,error.code);
    return fail(404,"EPISODE_PARENT_NOT_FOUND");
  }
}
