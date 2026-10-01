import type {SupabaseClient} from "@supabase/supabase-js";
export const PRODUCTION_FRAME_BUCKET="production-frames";
export function productionFrameStoragePath(input:{creatorId:string;seriesId:string;storyboardId:string;frameId:string;generationId:string;attemptId:string}){
 return `users/${input.creatorId}/series/${input.seriesId}/storyboards/${input.storyboardId}/frames/${input.frameId}/${input.generationId}/${input.attemptId}.png`;
}
export async function uploadProductionFrame(supabase:SupabaseClient,input:{creatorId:string;seriesId:string;storyboardId:string;frameId:string;generationId:string;attemptId:string;bytes:Uint8Array;mimeType:string}){
 const path=productionFrameStoragePath(input);
 const {error}=await supabase.storage.from(PRODUCTION_FRAME_BUCKET).upload(path,Buffer.from(input.bytes),{contentType:input.mimeType,cacheControl:"31536000",upsert:false});
 if(error)throw new Error("PRODUCTION_FRAME_STORAGE_FAILED");
 const {data}=supabase.storage.from(PRODUCTION_FRAME_BUCKET).getPublicUrl(path);
 return{storagePath:path,url:data.publicUrl};
}
export async function removeProductionFrame(supabase:SupabaseClient,path:string){await supabase.storage.from(PRODUCTION_FRAME_BUCKET).remove([path]);}
