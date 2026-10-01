import {createHash} from "node:crypto";

export const MAX_PRODUCTION_REFERENCE_BYTES=10*1024*1024;
export const SUPPORTED_REFERENCE_MIME_TYPES=["image/png","image/jpeg","image/webp"] as const;
export type SupportedReferenceMime=typeof SUPPORTED_REFERENCE_MIME_TYPES[number];

export function referenceChecksum(bytes:Uint8Array){return createHash("sha256").update(bytes).digest("hex");}
function u16le(b:Uint8Array,o:number){return b[o]|(b[o+1]<<8);}
function u24le(b:Uint8Array,o:number){return b[o]|(b[o+1]<<8)|(b[o+2]<<16);}
function u32be(b:Uint8Array,o:number){return ((b[o]<<24)>>>0)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3];}

export function inspectProductionReferenceImage(bytes:Uint8Array,mimeType:string){
 if(!SUPPORTED_REFERENCE_MIME_TYPES.includes(mimeType as SupportedReferenceMime))throw new Error("UNSUPPORTED_REFERENCE_MIME");
 if(bytes.length===0||bytes.length>MAX_PRODUCTION_REFERENCE_BYTES)throw new Error(bytes.length?"REFERENCE_FILE_TOO_LARGE":"REFERENCE_FILE_EMPTY");
 if(mimeType==="image/png"){
  if(bytes.length<24||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error("INVALID_REFERENCE_IMAGE");
  const width=u32be(bytes,16),height=u32be(bytes,20);if(!width||!height)throw new Error("INVALID_REFERENCE_IMAGE");
  return{width,height,mimeType:"image/png" as const,extension:"png",checksum:referenceChecksum(bytes)};
 }
 if(mimeType==="image/jpeg"){
  if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error("INVALID_REFERENCE_IMAGE");
  let i=2;
  while(i+8<bytes.length){
   if(bytes[i]!==0xff){i++;continue;} const marker=bytes[i+1];i+=2;
   if(marker===0xd9||marker===0xda)break;
   const len=(bytes[i]<<8)|bytes[i+1];if(len<2||i+len>bytes.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
    const height=(bytes[i+3]<<8)|bytes[i+4],width=(bytes[i+5]<<8)|bytes[i+6];if(!width||!height)break;
    return{width,height,mimeType:"image/jpeg" as const,extension:"jpg",checksum:referenceChecksum(bytes)};
   }
   i+=len;
  }
  throw new Error("INVALID_REFERENCE_IMAGE");
 }
 if(bytes.length<30||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")throw new Error("INVALID_REFERENCE_IMAGE");
 const chunk=String.fromCharCode(...bytes.slice(12,16));let width=0,height=0;
 if(chunk==="VP8X"){width=1+u24le(bytes,24);height=1+u24le(bytes,27);}
 else if(chunk==="VP8L"){width=1+(((bytes[22]&0x3f)<<8)|bytes[21]);height=1+(((bytes[24]&0x0f)<<10)|(bytes[23]<<2)|((bytes[22]&0xc0)>>6));}
 else if(chunk==="VP8 "&&bytes.length>=30){width=u16le(bytes,26)&0x3fff;height=u16le(bytes,28)&0x3fff;}
 if(!width||!height)throw new Error("INVALID_REFERENCE_IMAGE");
 return{width,height,mimeType:"image/webp" as const,extension:"webp",checksum:referenceChecksum(bytes)};
}
