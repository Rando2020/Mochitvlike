import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string}>}){
  const {seriesId,assemblyId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  try{
    const assembly=await getEpisodeAssembly(supabase,user.id,assemblyId);
    if(assembly.series_id!==seriesId||assembly.episode_key!=="episodeOne")return NextResponse.json({error:{code:"EPISODE_ASSEMBLY_NOT_FOUND"}},{status:404});
    return NextResponse.json({episodeAssembly:{id:assembly.id,status:assembly.status,version:assembly.version,timeline:assembly.timeline,preview:assembly.preview}},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:{code:"EPISODE_ASSEMBLY_NOT_FOUND"}},{status:404});}
}
