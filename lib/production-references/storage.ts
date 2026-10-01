import type {SupabaseClient} from "@supabase/supabase-js";
export const PRODUCTION_REFERENCE_BUCKET="production-references";
export function referenceStoragePath(input:{creatorId:string;seriesId:string;referenceId:string;checksum:string;extension:string}){
 return `users/${input.creatorId}/series/${input.seriesId}/references/${input.referenceId}/${input.checksum}.${input.extension}`;
}
export async function uploadProductionReference(supabase:SupabaseClient,input:{creatorId:string;seriesId:string;referenceId:string;checksum:string;extension:string;bytes:Uint8Array;mimeType:string}){
 const path=referenceStoragePath(input);
 const {error}=await supabase.storage.from(PRODUCTION_REFERENCE_BUCKET).upload(path,Buffer.from(input.bytes),{contentType:input.mimeType,cacheControl:"31536000",upsert:false});
 if(error)throw new Error("PRODUCTION_REFERENCE_STORAGE_FAILED");
 return{storagePath:path,assetUrl:`storage://${PRODUCTION_REFERENCE_BUCKET}/${path}`};
}
export async function signedProductionReferenceUrl(supabase:SupabaseClient,storagePath:string,expiresIn=600){
 const {data,error}=await supabase.storage.from(PRODUCTION_REFERENCE_BUCKET).createSignedUrl(storagePath,expiresIn);
 if(error||!data?.signedUrl)throw new Error("PRODUCTION_REFERENCE_SIGNING_FAILED");
 return data.signedUrl;
}
