import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getProductionFrame} from "@/lib/production-frames/persistence";
import {VisualModelRegistry} from "@/lib/visual-models/registry";
export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;panelId:string;frameId:string}>}){
 const ids=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  const frame=await getProductionFrame(supabase,user.id,ids.frameId);
  if(frame.seriesId!==ids.seriesId||frame.sceneId!==ids.sceneId||frame.scriptId!==ids.scriptId||frame.visualPlanId!==ids.planId||frame.storyboardId!==ids.storyboardId||frame.storyboardPanelId!==ids.panelId)throw new Error("PRODUCTION_FRAME_NOT_FOUND");
  const model=new VisualModelRegistry().get(frame.modelId);
  return NextResponse.json({productionFrame:{
   id:frame.id,status:frame.status,version:frame.version,developmentVisual:frame.developmentVisual,
   model:{id:frame.modelId,displayName:model?.displayName??frame.modelId,revision:frame.modelRevision},
   generation:frame.generation?{id:frame.generation.id,status:frame.generation.status,outputUrl:frame.generation.outputUrl,width:frame.generation.width,height:frame.generation.height,mimeType:frame.generation.mimeType,error:frame.generation.errorCode?{code:frame.generation.errorCode}:null,retryCount:frame.generation.retryCount,canRetry:frame.generation.status==="FAILED"&&frame.generation.retryCount<3}:null,
   warnings:frame.developmentVisual?["Development Visual: generated with a non-approved development model."]:[]
  },pollAfterMs:1500},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:{code:"PRODUCTION_FRAME_NOT_FOUND"}},{status:404});}
}
