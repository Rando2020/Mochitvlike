import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string}>}){
 const {seriesId,sceneId,scriptId,planId,storyboardId}=await params;
 const supabase=await createServerSupabaseClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  const row=await getStoryboard(supabase,user.id,storyboardId);
  if(row.series_id!==seriesId||row.scene_id!==sceneId||row.script_id!==scriptId||row.visual_plan_id!==planId)throw new Error("not-found");
  const states=await getPanelStates(supabase,user.id,storyboardId);
  const effective=materializeStoryboard(row.blueprint,states);
  return NextResponse.json({
   storyboard:{id:row.id,status:row.status,version:row.version,title:effective.identity.title,
    panelCount:effective.panels.length,completedPanels:states.filter(s=>s.status==="COMPLETED").length,
    panels:effective.panels.map(p=>({
     id:p.id,sequenceIndex:p.sequenceIndex,purpose:p.purpose,moment:p.moment,characterIds:p.characterIds,
     framingIntent:p.framingIntent,generationStatus:p.generationStatus,asset:p.asset,
     error:states.find(s=>s.panelId===p.id)?.errorCode?{code:states.find(s=>s.panelId===p.id)!.errorCode}:null,
     retryCount:states.find(s=>s.panelId===p.id)?.retryCount??0,
     composition:p.composition,staging:p.staging,emotionalFocus:p.emotionalFocus,sourceScriptBlockIds:p.sourceScriptBlockIds
    })),pollAfterMs:1500}
  },{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:{code:"STORYBOARD_NOT_FOUND"}},{status:404});}
}
