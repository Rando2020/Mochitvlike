import {timingSafeEqual} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {processDialogueAudioJob} from "@/lib/dialogue-audio/jobs/processDialogueAudioJob";

export const runtime="nodejs";
export const maxDuration=90;
function authorized(request:NextRequest){
  const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!expected||!supplied)return false;const a=Buffer.from(expected),b=Buffer.from(supplied);
  return a.length===b.length&&timingSafeEqual(a,b);
}
async function run(request:NextRequest){
  if(!authorized(request))return NextResponse.json({error:{code:"UNAUTHORIZED"}},{status:401});
  const supabase=createAdminSupabaseClient();
  const {data,error}=await supabase.rpc("claim_next_dialogue_audio_generation",{p_lease_seconds:180});
  if(error)return NextResponse.json({error:{code:"QUEUE_CLAIM_FAILED"}},{status:500});
  const job=Array.isArray(data)?data[0]:null;if(!job)return NextResponse.json({processed:0,results:[]});
  const result=await processDialogueAudioJob({supabase,jobId:job.id,claimToken:job.claim_token});
  return NextResponse.json({processed:1,results:[result]});
}
export async function GET(request:NextRequest){return run(request);}
export async function POST(request:NextRequest){return run(request);}
