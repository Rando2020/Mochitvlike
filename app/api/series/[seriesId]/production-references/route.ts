import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getPerformanceBibles} from "@/lib/production-frames/persistence";
import {listProductionReferenceRecords} from "@/lib/production-references/persistence";
import {signedProductionReferenceUrl} from "@/lib/production-references/storage";
import {createProductionReference} from "@/lib/production-references/service";
import {ReferenceMetadataSchema} from "@/lib/production-references/schema";

export const runtime="nodejs";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string}>}){
 const {seriesId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  await getSeries(supabase,user.id,seriesId);
  const admin=createAdminSupabaseClient(),records=await listProductionReferenceRecords(admin,user.id,seriesId);
  const safe=await Promise.all(records.map(async r=>({...r,assetUrl:r.storagePath?await signedProductionReferenceUrl(admin,r.storagePath,600):null,storagePath:undefined})));
  return NextResponse.json({references:safe},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:{code:"SERIES_OR_REFERENCES_NOT_FOUND"}},{status:404});}
}

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string}>}){
 const {seriesId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  const series=await getSeries(supabase,user.id,seriesId);
  const form=await request.formData();const file=form.get("file"),raw=form.get("metadata");
  if(!(file instanceof File)||typeof raw!=="string")return NextResponse.json({error:{code:"INVALID_REFERENCE_UPLOAD"}},{status:400});
  const parsed=ReferenceMetadataSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:{code:"INVALID_REFERENCE_METADATA"}},{status:400});
  const bibles=await getPerformanceBibles(supabase,user.id,seriesId,series.blueprint);const admin=createAdminSupabaseClient();
  const created=await createProductionReference({admin,userId:user.id,seriesId,series:series.blueprint,performanceBibles:bibles,file:{bytes:new Uint8Array(await file.arrayBuffer()),mimeType:file.type},metadata:parsed.data});
  return NextResponse.json({reference:created},{status:201});
 }catch(caught){const code=caught instanceof Error?caught.message:"REFERENCE_UPLOAD_FAILED";const client=["UNSUPPORTED_REFERENCE_MIME","REFERENCE_FILE_TOO_LARGE","REFERENCE_FILE_EMPTY","INVALID_REFERENCE_IMAGE","INVALID_CHARACTER_ASSOCIATION","CHARACTER_REFERENCE_ROLE_REQUIRED","ABILITY_ASSOCIATION_REQUIRED","INVALID_ABILITY_ASSOCIATION","INVALID_ABILITY_SLOT","INVALID_LOCATION_ASSOCIATION","PROP_SCOPE_REQUIRED"].some(x=>code.includes(x));return NextResponse.json({error:{code}},{status:client?400:404});}
}
