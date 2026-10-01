import {compileProductionFramePrompt} from "./prompt";
import type {GeneratedProductionFrame,ProductionFrameGenerationSpec} from "./types";

export interface ProductionFrameProvider{
 readonly name:string;
 readonly architecture:string;
 generate(spec:ProductionFrameGenerationSpec,context?:{signal?:AbortSignal;onProviderTaskCreated?:(taskId:string)=>void}):Promise<GeneratedProductionFrame>;
}

const SERVICE_ERROR_CODES=new Set([
 "MODEL_NOT_SUPPORTED","MODEL_REVISION_MISMATCH","MODEL_LOAD_FAILED","INVALID_REQUEST","REFERENCE_DOWNLOAD_FAILED",
 "REFERENCE_CHECKSUM_MISMATCH","REFERENCE_DECODE_FAILED","REFERENCE_CONDITIONING_NOT_SUPPORTED","INFERENCE_TIMEOUT",
 "GPU_OOM","INVALID_GENERATED_IMAGE","INTERNAL_TRANSIENT","UNAUTHENTICATED","SERVICE_NOT_READY"
]);

export class HttpProductionFrameProvider implements ProductionFrameProvider{
 readonly name="VISUAL_INFERENCE_SERVICE";readonly architecture="MULTI";
 constructor(private readonly endpoint=process.env.VISUAL_INFERENCE_URL,private readonly token=process.env.VISUAL_INFERENCE_TOKEN){}
 private url(){
  if(!this.endpoint||!this.token)throw new Error("PRODUCTION_FRAME_PROVIDER_NOT_CONFIGURED");
  const base=this.endpoint.replace(/\/$/,"");
  return base.endsWith("/v1/production-frame")?base:`${base}/v1/production-frame`;
 }
 async generate(spec:ProductionFrameGenerationSpec,context?:{signal?:AbortSignal;onProviderTaskCreated?:(taskId:string)=>void}):Promise<GeneratedProductionFrame>{
  const compiled=compileProductionFramePrompt(spec);
  const response=await fetch(this.url(),{method:"POST",signal:context?.signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.token}`},body:JSON.stringify({spec,prompt:compiled.prompt})});
  const body=await response.json().catch(()=>null) as {taskId?:string;imageBase64?:string;mimeType?:string;width?:number;height?:number;error?:{code?:string}}|null;
  if(!response.ok){
   const code=body?.error?.code;
   if(response.status===408||response.status===504||code==="INFERENCE_TIMEOUT")throw new Error("PRODUCTION_FRAME_PROVIDER_TIMEOUT");
   if(code&&SERVICE_ERROR_CODES.has(code))throw new Error(`PRODUCTION_FRAME_PROVIDER_${code}`);
   throw new Error("PRODUCTION_FRAME_PROVIDER_FAILED");
  }
  if(body?.taskId)context?.onProviderTaskCreated?.(body.taskId);
  if(!body?.imageBase64||body.mimeType!=="image/png"||!body.width||!body.height)throw new Error("PRODUCTION_FRAME_PROVIDER_MALFORMED");
  return{bytes:Uint8Array.from(Buffer.from(body.imageBase64,"base64")),mimeType:body.mimeType,width:body.width,height:body.height,providerTaskId:body.taskId??null};
 }
}
