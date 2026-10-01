import {compileProductionFramePrompt} from "./prompt";
import type {GeneratedProductionFrame,ProductionFrameGenerationSpec} from "./types";

export interface ProductionFrameProvider{
 readonly name:string;
 readonly architecture:string;
 generate(spec:ProductionFrameGenerationSpec,context?:{signal?:AbortSignal;onProviderTaskCreated?:(taskId:string)=>void}):Promise<GeneratedProductionFrame>;
}

export class HttpProductionFrameProvider implements ProductionFrameProvider{
 readonly name="VISUAL_INFERENCE_SERVICE";readonly architecture="MULTI";
 constructor(private readonly endpoint=process.env.VISUAL_INFERENCE_URL,private readonly token=process.env.VISUAL_INFERENCE_TOKEN){}
 async generate(spec:ProductionFrameGenerationSpec,context?:{signal?:AbortSignal;onProviderTaskCreated?:(taskId:string)=>void}):Promise<GeneratedProductionFrame>{
  if(!this.endpoint)throw new Error("PRODUCTION_FRAME_PROVIDER_NOT_CONFIGURED");
  const compiled=compileProductionFramePrompt(spec);
  const response=await fetch(this.endpoint,{method:"POST",signal:context?.signal,headers:{"Content-Type":"application/json",...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify({spec,prompt:compiled.prompt})});
  if(!response.ok)throw new Error(response.status===408||response.status===504?"PRODUCTION_FRAME_PROVIDER_TIMEOUT":"PRODUCTION_FRAME_PROVIDER_FAILED");
  const body=await response.json() as {taskId?:string;imageBase64?:string;mimeType?:string;width?:number;height?:number};
  if(body.taskId)context?.onProviderTaskCreated?.(body.taskId);
  if(!body.imageBase64||!body.mimeType||!body.width||!body.height)throw new Error("PRODUCTION_FRAME_PROVIDER_MALFORMED");
  return{bytes:Uint8Array.from(Buffer.from(body.imageBase64,"base64")),mimeType:body.mimeType,width:body.width,height:body.height,providerTaskId:body.taskId??null};
 }
}
