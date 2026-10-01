import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard} from "@/lib/storyboards/persistence";
import {selectVisualProductionModel,VisualModelSelectionError} from "@/lib/production-frames/modelSelector";
import {getLatestProductionFrameForPanel,getPerformanceBibles,getPerformanceBindings,getProductionReferences} from "@/lib/production-frames/persistence";
import {buildProductionFrameGenerationSpec} from "@/lib/production-frames/compiler";
import {productionFrameSpecChecksum} from "@/lib/production-frames/prompt";
import {ProductionReferenceError} from "@/lib/production-frames/references";

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;panelId:string}>}){
 const ids=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 const body=await request.json().catch(()=>null);
 if(!body||body.mode!=="INITIAL"||Object.keys(body).length!==1)return NextResponse.json({error:{code:"INVALID_REQUEST"}},{status:400});
 try{
  const series=await getSeries(supabase,user.id,ids.seriesId);const scene=await getScene(supabase,user.id,ids.seriesId,ids.sceneId,series.blueprint);
  const script=await getScript(supabase,user.id,ids.seriesId,ids.sceneId,ids.scriptId,series.blueprint,scene.blueprint);
  const visualPlan=await getVisualPlan(supabase,user.id,ids.seriesId,ids.sceneId,ids.scriptId,ids.planId,series.blueprint,scene.blueprint,script.script);
  const storyboard=await getStoryboard(supabase,user.id,ids.storyboardId);
  if(storyboard.series_id!==ids.seriesId||storyboard.scene_id!==ids.sceneId||storyboard.script_id!==ids.scriptId||storyboard.visual_plan_id!==ids.planId)throw new Error("PARENT_NOT_FOUND");
  const panel=storyboard.blueprint.panels.find(p=>p.id===ids.panelId);if(!panel)throw new Error("PANEL_NOT_FOUND");
  const existing=await getLatestProductionFrameForPanel(supabase,user.id,panel.id);
  if(existing)return NextResponse.json({productionFrame:existing},{status:existing.status==="READY"?200:202});

  const selected=selectVisualProductionModel();
  const [references,bibles,bindings]=await Promise.all([
   getProductionReferences(supabase,user.id,ids.seriesId),
   getPerformanceBibles(supabase,user.id,ids.seriesId,series.blueprint),
   getPerformanceBindings(supabase,user.id,ids.storyboardId,panel.id)
  ]);
  const spec=buildProductionFrameGenerationSpec({
   series:series.blueprint,scene:scene.blueprint,script:script.script,visualPlan:visualPlan.plan,storyboard:storyboard.blueprint,panel,
   model:selected.model,developmentOverride:selected.developmentOverride,references,performanceBibles:bibles,performanceBindings:bindings,
   canonContext:{episodeNumber:1,activeCanonFactIds:series.blueprint.canon.facts.map(f=>f.id)}
  });
  const generationId=randomUUID(),admin=createAdminSupabaseClient();
  const {data:created,error:createError}=await admin.rpc("create_production_frame_with_generation",{
   p_frame_id:spec.id,p_generation_id:generationId,p_creator_id:user.id,p_series_id:ids.seriesId,p_scene_id:ids.sceneId,p_script_id:ids.scriptId,p_visual_plan_id:ids.planId,p_storyboard_id:ids.storyboardId,p_panel_id:panel.id,
   p_version:1,p_development_visual:selected.developmentOverride,p_model_id:selected.model.id,p_model_revision:selected.model.source.revision,p_provider:"VISUAL_INFERENCE_SERVICE",p_architecture:selected.model.architecture,
   p_spec:spec,p_spec_checksum:productionFrameSpecChecksum(spec),p_prompt_checksum:spec.promptChecksum,p_seed:spec.seed
  });
  if(createError)return NextResponse.json({error:{code:"PRODUCTION_FRAME_PERSISTENCE_FAILED"}},{status:503});
  if(created!==true){const winner=await getLatestProductionFrameForPanel(supabase,user.id,panel.id);if(winner)return NextResponse.json({productionFrame:winner},{status:winner.status==="READY"?200:202});}
  return NextResponse.json({productionFrame:{id:spec.id,status:"GENERATING",developmentVisual:selected.developmentOverride,modelId:selected.model.id,modelRevision:selected.model.source.revision,generation:{id:generationId,status:"PENDING"},pollAfterMs:1500},warnings:selected.developmentOverride?["Development Visual: non-approved model override is active."]:[]},{status:202});
 }catch(error){
  if(error instanceof VisualModelSelectionError)return NextResponse.json({error:{code:error.code}},{status:409});
  if(error instanceof ProductionReferenceError)return NextResponse.json({error:{code:error.code}},{status:409});
  const code=error instanceof Error&&["PANEL_NOT_FOUND","PARENT_NOT_FOUND"].includes(error.message)?"PRODUCTION_FRAME_PARENT_NOT_FOUND":error instanceof Error?error.message:"PRODUCTION_FRAME_GENERATION_FAILED";
  return NextResponse.json({error:{code}},{status:code==="PRODUCTION_FRAME_PARENT_NOT_FOUND"?404:409});
 }
}
