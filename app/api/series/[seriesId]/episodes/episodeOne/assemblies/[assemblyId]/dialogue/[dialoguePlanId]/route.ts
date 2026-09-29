import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getDialogueAudioPlan,getDialogueLineStates,getVoiceCast,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string}>}){
  const {seriesId,assemblyId,dialoguePlanId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  try{
    const row=await getDialogueAudioPlan(supabase,user.id,dialoguePlanId);
    if(row.series_id!==seriesId||row.episode_assembly_id!==assemblyId)return NextResponse.json({error:{code:"DIALOGUE_PLAN_NOT_FOUND"}},{status:404});
    const cast=await getVoiceCast(supabase,user.id,row.voice_cast_id);
    const states=await getDialogueLineStates(supabase,user.id,row.id);
    const plan=materializeDialogueAudioPlan(row.plan,states);
    const stateById=new Map(states.map(s=>[s.lineId,s]));
    const lines=plan.lines.map(line=>{
      const state=stateById.get(line.id);
      return{...line,retryCount:state?.retryCount??0,error:state?.errorCode?{code:state.errorCode}:null};
    });
    return NextResponse.json({
      dialogue:{
        id:row.id,status:row.status,version:row.version,voiceCast:cast.cast,
        plan:{...plan,lines},
        aiVoiceDisclosure:"Voices in this preview are AI-generated.",
        pollAfterMs:row.status==="GENERATING"?1500:null
      }
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:{code:"DIALOGUE_PLAN_NOT_FOUND"}},{status:404});}
}
