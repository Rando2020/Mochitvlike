import type {SupabaseClient} from "@supabase/supabase-js";
const BUCKET="dialogue-audio";
export class DialogueAudioStorageError extends Error{constructor(){super("DIALOGUE_AUDIO_STORAGE_FAILED");this.name="DialogueAudioStorageError";}}
export function dialogueAudioStoragePath(input:{creatorId:string;planId:string;lineId:string;attemptId:string}){
  return "users/"+input.creatorId+"/dialogue-plans/"+input.planId+"/lines/"+input.lineId+"/"+input.attemptId+".wav";
}
export async function uploadDialogueAudio(supabase:SupabaseClient,input:{creatorId:string;planId:string;lineId:string;attemptId:string;bytes:Uint8Array}){
  const storagePath=dialogueAudioStoragePath(input);
  const {error}=await supabase.storage.from(BUCKET).upload(storagePath,input.bytes,{contentType:"audio/wav",cacheControl:"31536000",upsert:false});
  if(error)throw new DialogueAudioStorageError();
  const {data}=supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  if(!data.publicUrl)throw new DialogueAudioStorageError();
  return{storagePath,url:data.publicUrl};
}
export async function removeDialogueAudio(supabase:SupabaseClient,storagePath:string){await supabase.storage.from(BUCKET).remove([storagePath]);}
