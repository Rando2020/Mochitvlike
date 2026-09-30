import type {SupabaseClient} from "@supabase/supabase-js";
export class SoundStorageError extends Error{constructor(){super("SOUND_STORAGE_FAILED");this.name="SoundStorageError";}}
const BUCKET="episode-sound";
export function soundStoragePath(input:{creatorId:string;planId:string;cueId:string;attemptId:string}){return"users/"+input.creatorId+"/sound-plans/"+input.planId+"/cues/"+input.cueId+"/"+input.attemptId+".mp3";}
export async function uploadSoundAsset(supabase:SupabaseClient,input:{creatorId:string;planId:string;cueId:string;attemptId:string;bytes:Uint8Array}){
 const storagePath=soundStoragePath(input);const{error}=await supabase.storage.from(BUCKET).upload(storagePath,input.bytes,{contentType:"audio/mpeg",cacheControl:"31536000",upsert:false});if(error)throw new SoundStorageError();
 const{data}=supabase.storage.from(BUCKET).getPublicUrl(storagePath);if(!data.publicUrl)throw new SoundStorageError();return{storagePath,url:data.publicUrl};
}
export async function removeSoundAsset(supabase:SupabaseClient,path:string){await supabase.storage.from(BUCKET).remove([path]);}
