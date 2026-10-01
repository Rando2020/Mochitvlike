import {createHash} from "node:crypto";
import type {GeneratedProductionFrame,ProductionFrameGenerationSpec} from "./types";

export type ProductionFrameQualityResult={ok:true;checksum:string}|{ok:false;code:"EMPTY_IMAGE"|"UNSUPPORTED_IMAGE_MIME"|"INVALID_IMAGE_BYTES"|"IMAGE_DIMENSION_MISMATCH"|"MODEL_MISMATCH"|"PROMPT_MISMATCH"|"REFERENCE_PROVENANCE_INVALID"};

function checksum(bytes:Uint8Array){return createHash("sha256").update(bytes).digest("hex");}
function pngDimensions(bytes:Uint8Array){
 if(bytes.length<24)return null;
 const sig=[137,80,78,71,13,10,26,10];if(!sig.every((v,i)=>bytes[i]===v))return null;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 return{width:view.getUint32(16),height:view.getUint32(20)};
}
export function validateProductionFrameOutput(spec:ProductionFrameGenerationSpec,generated:GeneratedProductionFrame):ProductionFrameQualityResult{
 if(!generated.bytes.length)return{ok:false,code:"EMPTY_IMAGE"};
 if(generated.mimeType!=="image/png")return{ok:false,code:"UNSUPPORTED_IMAGE_MIME"};
 const dimensions=pngDimensions(generated.bytes);if(!dimensions)return{ok:false,code:"INVALID_IMAGE_BYTES"};
 if(dimensions.width!==spec.output.width||dimensions.height!==spec.output.height||generated.width!==spec.output.width||generated.height!==spec.output.height)return{ok:false,code:"IMAGE_DIMENSION_MISMATCH"};
 if(spec.references.some(r=>r.benchmarkOnly||!r.approved||!r.creatorApproved))return{ok:false,code:"REFERENCE_PROVENANCE_INVALID"};
 return{ok:true,checksum:checksum(generated.bytes)};
}
