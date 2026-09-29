import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;animaticId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId,animaticId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
    const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
    const visualPlan=await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);
    const storyboardRow=await getStoryboard(supabase,user.id,storyboardId);
    if(storyboardRow.visual_plan_id!==planId)return NextResponse.json({error:{code:"ANIMATIC_NOT_FOUND"}},{status:404});
    const states=await getPanelStates(supabase,user.id,storyboardId);
    const storyboard=materializeStoryboard(storyboardRow.blueprint,states);
    const animatic=await getAnimatic(supabase,user.id,animaticId,script.script,visualPlan.plan,storyboard);
    if(animatic.storyboardId!==storyboardId)return NextResponse.json({error:{code:"ANIMATIC_NOT_FOUND"}},{status:404});
    return NextResponse.json({animatic:{id:animatic.id,status:animatic.status,version:animatic.version,timeline:animatic.timeline,preview:animatic.preview}},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:{code:"ANIMATIC_NOT_FOUND"}},{status:404});}
}
