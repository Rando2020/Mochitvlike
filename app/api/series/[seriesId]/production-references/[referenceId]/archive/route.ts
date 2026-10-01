import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getPerformanceBibles} from "@/lib/production-frames/persistence";
import {approveProductionReference,transitionProductionReference} from "@/lib/production-references/service";
export async function POST(_request:NextRequest,{params}:{params:Promise<{seriesId:string;referenceId:string}>}){
 const {seriesId,referenceId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{const series=await getSeries(supabase,user.id,seriesId);const admin=createAdminSupabaseClient();const reference=await transitionProductionReference({admin,userId:user.id,seriesId,referenceId,status:"ARCHIVED"});return NextResponse.json({reference});}
 catch(caught){const code=caught instanceof Error?caught.message:"PRODUCTION_REFERENCE_ARCHIVE_FAILED";return NextResponse.json({error:{code}},{status:code.includes("NOT_FOUND")?404:409});}
}