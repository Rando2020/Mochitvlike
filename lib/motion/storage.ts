import type {SupabaseClient} from "@supabase/supabase-js";
export const MOTION_BUCKET="motion-clips";

export async function uploadMotionClip(supabase:SupabaseClient,input:{
  creatorId:string;motionPlanId:string;motionClipId:string;attemptId:string;bytes:Uint8Array;mimeType:string;
}){
  const path="users/"+input.creatorId+"/motion-plans/"+input.motionPlanId+"/clips/"+input.motionClipId+"/"+input.attemptId+".mp4";
  const {error}=await supabase.storage.from(MOTION_BUCKET).upload(path,Buffer.from(input.bytes),{contentType:input.mimeType,cacheControl:"31536000",upsert:false});
  if(error)throw new Error("MOTION_STORAGE_FAILED");
  const {data}=supabase.storage.from(MOTION_BUCKET).getPublicUrl(path);
  return{storagePath:path,url:data.publicUrl};
}

export async function removeMotionClip(supabase:SupabaseClient,path:string){
  await supabase.storage.from(MOTION_BUCKET).remove([path]);
}
