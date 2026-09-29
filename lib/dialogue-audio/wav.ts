import {TTSProviderMalformedResponseError} from "./providers/errors";

export type WavMetadata={durationSeconds:number;sampleRate:number;channels:number;bitsPerSample:number;dataBytes:number};

function ascii(bytes:Uint8Array,start:number,length:number){return String.fromCharCode(...bytes.slice(start,start+length));}
function u16(view:DataView,o:number){return view.getUint16(o,true);}
function u32(view:DataView,o:number){return view.getUint32(o,true);}

export function parseWavMetadata(bytes:Uint8Array):WavMetadata{
  if(bytes.byteLength<44)throw new TTSProviderMalformedResponseError();
  if(ascii(bytes,0,4)!=="RIFF"||ascii(bytes,8,4)!=="WAVE")throw new TTSProviderMalformedResponseError();
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let offset=12,channels=0,sampleRate=0,bitsPerSample=0,byteRate=0,dataBytes=0;
  while(offset+8<=bytes.byteLength){
    const id=ascii(bytes,offset,4),size=u32(view,offset+4),body=offset+8;
    if(body+size>bytes.byteLength)throw new TTSProviderMalformedResponseError();
    if(id==="fmt "){
      if(size<16)throw new TTSProviderMalformedResponseError();
      const format=u16(view,body);if(format!==1)throw new TTSProviderMalformedResponseError("UNSUPPORTED_WAV_ENCODING");
      channels=u16(view,body+2);sampleRate=u32(view,body+4);byteRate=u32(view,body+8);bitsPerSample=u16(view,body+14);
    }else if(id==="data"){dataBytes=size;}
    offset=body+size+(size%2);
  }
  if(!channels||!sampleRate||!byteRate||!bitsPerSample||!dataBytes)throw new TTSProviderMalformedResponseError();
  const durationSeconds=dataBytes/byteRate;
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw new TTSProviderMalformedResponseError();
  return{durationSeconds,sampleRate,channels,bitsPerSample,dataBytes};
}
