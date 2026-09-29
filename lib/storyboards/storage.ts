import type {SupabaseClient} from "@supabase/supabase-js";
export const STORYBOARD_BUCKET="storyboard-panels";
export async function uploadStoryboardPanel(supabase:SupabaseClient,input:{creatorId:string;storyboardId:string;panelId:string;attemptId:string;bytes:Uint8Array;mimeType:string;}){
 const path=`users/${input.creatorId}/storyboards/${input.storyboardId}/panels/${input.panelId}/${input.attemptId}.png`;
 const {error}=await supabase.storage.from(STORYBOARD_BUCKET).upload(path,Buffer.from(input.bytes),{contentType:input.mimeType,cacheControl:"31536000",upsert:false});
 if(error)throw new Error("STORYBOARD_STORAGE_FAILED");
 const {data}=supabase.storage.from(STORYBOARD_BUCKET).getPublicUrl(path);
 return{storagePath:path,url:data.publicUrl};
}
export async function removeStoryboardPanel(supabase:SupabaseClient,path:string){await supabase.storage.from(STORYBOARD_BUCKET).remove([path]);}
