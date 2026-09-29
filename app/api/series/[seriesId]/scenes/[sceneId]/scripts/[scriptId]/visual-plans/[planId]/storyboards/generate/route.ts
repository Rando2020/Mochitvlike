import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {compileStoryboardBlueprint} from "@/lib/storyboards/compileStoryboardBlueprint";
import {buildStoryboardPanelPrompt} from "@/lib/storyboards/images/buildStoryboardPanelPrompt";
import {getLatestStoryboard,getPanelStates} from "@/lib/storyboards/persistence";

const Body=z.object({mode:z.literal("INITIAL")}).strict(),Uuid=z.string().uuid();
function fail(status:number,code:string){return NextResponse.json({error:{code}},{status});}
function summary(row:{id:string;status:string;blueprint:{panels:unknown[]}},completed:number){
 return{id:row.id,status:row.status,panelCount:row.blueprint.panels.length,completedPanels:completed,pollAfterMs:1500};
}

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string}>}){
 const {seriesId,sceneId,scriptId,planId}=await params;
 if([seriesId,sceneId,scriptId,planId].some(id=>!Uuid.safeParse(id).success))return fail(404,"STORYBOARD_PARENT_NOT_FOUND");
 let json:unknown;try{json=await request.json();}catch{return fail(400,"INVALID_STORYBOARD_REQUEST");}
 if(!Body.safeParse(json).success)return fail(400,"INVALID_STORYBOARD_REQUEST");

 const supabase=await createServerSupabaseClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return fail(401,"UNAUTHENTICATED");

 try{
  const series=await getSeries(supabase,user.id,seriesId);
  const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
  const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
  const visualPlan=await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);

  const existing=await getLatestStoryboard(supabase,user.id,planId);
  if(existing){
   const states=await getPanelStates(supabase,user.id,existing.id);
   const completed=states.filter(s=>s.status==="COMPLETED").length;
   return NextResponse.json({storyboard:summary(existing,completed)},{status:existing.status==="READY"?200:202});
  }

  const storyboardId=randomUUID();
  const compiled=compileStoryboardBlueprint({
   storyboardId,seriesId,sceneId,scriptId,visualPlanId:planId,version:1,
   series:series.blueprint,scene:scene.blueprint,script:script.script,visualPlan:visualPlan.plan
  });
  const provider="openai",model=process.env.OPENAI_STORYBOARD_IMAGE_MODEL??"gpt-image-2";
  const jobs=compiled.specs.map(spec=>{const prompt=buildStoryboardPanelPrompt(spec);return{
   id:randomUUID(),panel_id:spec.panelId,prompt_checksum:prompt.promptChecksum,prompt_version:prompt.promptVersion,provider,model
  };});

  const admin=createAdminSupabaseClient();
  const {data:created,error:createError}=await admin.rpc("create_storyboard_with_panel_jobs",{
   p_storyboard_id:storyboardId,p_creator_id:user.id,p_series_id:seriesId,p_scene_id:sceneId,p_script_id:scriptId,
   p_visual_plan_id:planId,p_version:1,p_blueprint:compiled.blueprint,p_jobs:jobs
  });
  if(createError)return fail(503,"STORYBOARD_QUEUE_FAILED");

  if(created!==true){
   const raced=await getLatestStoryboard(supabase,user.id,planId);
   if(!raced)return fail(409,"STORYBOARD_PERSISTENCE_RACE");
   const states=await getPanelStates(supabase,user.id,raced.id);
   return NextResponse.json({storyboard:summary(raced,states.filter(s=>s.status==="COMPLETED").length)},{status:raced.status==="READY"?200:202});
  }

  return NextResponse.json({storyboard:{id:storyboardId,status:"GENERATING",panelCount:compiled.blueprint.panels.length,completedPanels:0,pollAfterMs:1500}},{status:202});
 }catch{
  return fail(404,"STORYBOARD_PARENT_NOT_FOUND");
 }
}
