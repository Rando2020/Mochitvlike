import {mapTargetToRunwayDuration} from "../duration";
import type {GeneratedMotionVideo,MotionVideoProvider} from "../types";
import {VideoProviderMalformedResponseError,VideoProviderRefusalError,VideoProviderTimeoutError,VideoProviderTransientError} from "./errors";

const API="https://api.dev.runwayml.com/v1";
const VERSION="2024-11-06";
const POLL_MS=6000;
const MAX_WAIT_MS=9*60*1000;

type Task={id:string;status:"PENDING"|"THROTTLED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELED";output?:string[];failure?:string};

function headers(){
  const secret=process.env.RUNWAYML_API_SECRET;
  if(!secret)throw new VideoProviderTransientError();
  return{"Content-Type":"application/json","Authorization":"Bearer "+secret,"X-Runway-Version":VERSION};
}

async function safeJson(response:Response){
  try{return await response.json();}catch{return null;}
}

async function retrieve(taskId:string,signal?:AbortSignal):Promise<Task>{
  let response:Response;
  try{response=await fetch(API+"/tasks/"+encodeURIComponent(taskId),{headers:headers(),signal,cache:"no-store"});}
  catch(error){if(signal?.aborted)throw new VideoProviderTimeoutError();throw new VideoProviderTransientError();}
  if(response.status===429||response.status>=500)throw new VideoProviderTransientError();
  if(!response.ok)throw new VideoProviderMalformedResponseError();
  const body=await safeJson(response);
  if(!body||typeof body.id!=="string"||typeof body.status!=="string")throw new VideoProviderMalformedResponseError();
  return body as Task;
}

export class RunwayMotionVideoProvider implements MotionVideoProvider{
  readonly name="runway";
  readonly model=process.env.RUNWAY_MOTION_MODEL??"gen4.5";

  async generate(input:{
    sourceImageUrl:string;prompt:string;negativeConstraints:string[];durationSeconds:number;aspectRatio:"16:9";signal?:AbortSignal;
    resumeTaskId?:string;onTaskCreated?:(taskId:string)=>Promise<void>;
  }):Promise<GeneratedMotionVideo>{
    const providerDuration=mapTargetToRunwayDuration(input.durationSeconds);
    let taskId=input.resumeTaskId;

    if(!taskId){
      let response:Response;
      try{
        response=await fetch(API+"/image_to_video",{
          method:"POST",headers:headers(),signal:input.signal,
          body:JSON.stringify({model:this.model,promptImage:input.sourceImageUrl,promptText:input.prompt,ratio:"1280:720",duration:providerDuration})
        });
      }catch(error){
        if(input.signal?.aborted)throw new VideoProviderTimeoutError();
        throw new VideoProviderTransientError();
      }
      if(response.status===429||response.status>=500)throw new VideoProviderTransientError();
      if(response.status===400||response.status===422)throw new VideoProviderRefusalError();
      if(!response.ok)throw new VideoProviderMalformedResponseError();
      const body=await safeJson(response);
      if(!body||typeof body.id!=="string")throw new VideoProviderMalformedResponseError();
      taskId=body.id;
      if(input.onTaskCreated)await input.onTaskCreated(taskId);
    }

    const durableTaskId=taskId;
    if(!durableTaskId)throw new VideoProviderMalformedResponseError();

    const started=Date.now();
    while(true){
      if(input.signal?.aborted||Date.now()-started>MAX_WAIT_MS)throw new VideoProviderTimeoutError();
      const task=await retrieve(durableTaskId,input.signal);
      if(task.status==="FAILED"||task.status==="CANCELED")throw new VideoProviderRefusalError();
      if(task.status==="SUCCEEDED"){
        const output=task.output?.[0];
        if(!output||!output.startsWith("https://"))throw new VideoProviderMalformedResponseError();
        let video:Response;
        try{video=await fetch(output,{signal:input.signal,cache:"no-store"});}
        catch(error){if(input.signal?.aborted)throw new VideoProviderTimeoutError();throw new VideoProviderTransientError();}
        if(!video.ok)throw new VideoProviderTransientError();
        const bytes=new Uint8Array(await video.arrayBuffer());
        if(bytes.byteLength<1024)throw new VideoProviderMalformedResponseError();
        return{bytes,mimeType:"video/mp4",durationSeconds:providerDuration,width:1280,height:720,provider:this.name,model:this.model,providerTaskId:durableTaskId};
      }
      await new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(resolve,POLL_MS);
        input.signal?.addEventListener("abort",()=>{clearTimeout(timer);reject(new VideoProviderTimeoutError());},{once:true});
      });
    }
  }
}
