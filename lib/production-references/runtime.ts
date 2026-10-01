import type {SupabaseClient} from "@supabase/supabase-js";
import type {ProductionFrameGenerationSpec} from "@/lib/production-frames/types";
import {signedProductionReferenceUrl} from "./storage";

export async function materializeRuntimeReferenceUrls(supabase:SupabaseClient,spec:ProductionFrameGenerationSpec):Promise<ProductionFrameGenerationSpec>{
 const references=await Promise.all(spec.references.map(async reference=>{
  if(!reference.storagePath)return reference;
  return{...reference,assetUrl:await signedProductionReferenceUrl(supabase,reference.storagePath,900)};
 }));
 return{...spec,references};
}
