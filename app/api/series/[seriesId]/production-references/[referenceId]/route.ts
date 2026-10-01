import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getPerformanceBibles} from "@/lib/production-frames/persistence";
import {getProductionReferenceRecord} from "@/lib/production-references/persistence";
import {signedProductionReferenceUrl} from "@/lib/production-references/storage";
import {ReferenceMetadataSchema} from "@/lib/production-references/schema";
import {approvalProblems} from "@/lib/production-references/validation";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;referenceId:string}>}){
 const {seriesId,referenceId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{await getSeries(supabase,user.id,seriesId);const admin=createAdminSupabaseClient(),r=await getProductionReferenceRecord(admin,user.id,seriesId,referenceId);const assetUrl=await signedProductionReferenceUrl(admin,r.storagePath,600);return NextResponse.json({reference:{...r,assetUrl,storagePath:undefined}},{headers:{"Cache-Control":"private, no-store"}});}
 catch{return NextResponse.json({error:{code:"PRODUCTION_REFERENCE_NOT_FOUND"}},{status:404});}
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{seriesId:string;referenceId:string}>}){
 const {seriesId,referenceId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  const series=await getSeries(supabase,user.id,seriesId),bibles=await getPerformanceBibles(supabase,user.id,seriesId,series.blueprint),admin=createAdminSupabaseClient();
  const current=await getProductionReferenceRecord(admin,user.id,seriesId,referenceId);if(current.status==="APPROVED")return NextResponse.json({error:{code:"APPROVED_REFERENCE_IMMUTABLE"}},{status:409});
  const parsed=ReferenceMetadataSchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:{code:"INVALID_REFERENCE_METADATA"}},{status:400});
  const m=parsed.data;
  const candidate={...current,type:m.type,source:m.source,characterId:m.characterId??null,abilityId:m.abilityId??null,locationId:m.locationId??null,propId:m.propId??null,referenceRole:m.referenceRole??null,abilitySlot:m.abilitySlot??null,modelCompatibility:m.modelCompatibility,provenance:m.provenance,visualMetadata:{...current.visualMetadata,notes:m.notes??null},benchmarkOnly:m.benchmarkOnly};
  const problems=approvalProblems(candidate,series.blueprint,bibles);
  const associationProblems=problems.filter(p=>!p.includes("PERMISSION")&&!["RIGHTS_RECORD_REQUIRED","CREATOR_RECORD_REQUIRED","SYNTHETIC_PROJECT_SPECIFIC_REQUIRED","BENCHMARK_REFERENCE_FORBIDDEN"].includes(p));
  if(associationProblems.length)return NextResponse.json({error:{code:associationProblems[0]}},{status:400});
  const status=problems.length?"UPLOADED":"REVIEW_REQUIRED";
  const {error:updateError}=await admin.from("production_reference_assets").update({type:m.type,source:m.source,character_id:candidate.characterId,ability_id:candidate.abilityId,location_id:candidate.locationId,prop_id:candidate.propId,reference_role:candidate.referenceRole,ability_slot:candidate.abilitySlot,model_compatibility:candidate.modelCompatibility,provenance:candidate.provenance,notes:candidate.visualMetadata.notes,benchmark_only:candidate.benchmarkOnly,status,approved:false,creator_approved:false}).eq("id",referenceId).eq("creator_id",user.id).eq("series_id",seriesId);
  if(updateError)throw new Error("PRODUCTION_REFERENCE_UPDATE_FAILED");
  return NextResponse.json({reference:{id:referenceId,status}});
 }catch(caught){const code=caught instanceof Error?caught.message:"PRODUCTION_REFERENCE_UPDATE_FAILED";return NextResponse.json({error:{code}},{status:code.includes("NOT_FOUND")?404:409});}
}
