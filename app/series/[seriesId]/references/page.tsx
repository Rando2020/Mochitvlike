import {notFound} from "next/navigation";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getPerformanceBibles} from "@/lib/production-frames/persistence";
import {listProductionReferenceRecords} from "@/lib/production-references/persistence";
import {signedProductionReferenceUrl} from "@/lib/production-references/storage";
import {ProductionReferenceStudio} from "@/components/production-references/ProductionReferenceStudio";

export default async function ProductionReferencesPage({params}:{params:Promise<{seriesId:string}>}){
 const {seriesId}=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
 try{
  const series=await getSeries(supabase,user.id,seriesId),bibles=await getPerformanceBibles(supabase,user.id,seriesId,series.blueprint),admin=createAdminSupabaseClient();
  const records=await listProductionReferenceRecords(admin,user.id,seriesId);
  const references=await Promise.all(records.map(async r=>({...r,assetUrl:await signedProductionReferenceUrl(admin,r.storagePath,600),storagePath:""})));
  return <ProductionReferenceStudio seriesId={seriesId} blueprint={series.blueprint} bibles={bibles} initialReferences={references}/>;
 }catch{notFound();}
}
