import {describe,expect,it} from "vitest";
import {inspectProductionReferenceImage,referenceChecksum,MAX_PRODUCTION_REFERENCE_BYTES} from "../image";
import {referenceStoragePath} from "../storage";

function png(w=32,h=16){const b=new Uint8Array(24);[137,80,78,71,13,10,26,10].forEach((v,i)=>b[i]=v);const v=new DataView(b.buffer);v.setUint32(16,w);v.setUint32(20,h);return b;}
function jpeg(w=32,h=16){const b=new Uint8Array(21);b.set([0xff,0xd8,0xff,0xc0,0,17,8,(h>>8)&255,h&255,(w>>8)&255,w&255],0);return b;}
function webp(w=32,h=16){const b=new Uint8Array(30);b.set([...Buffer.from("RIFF"),0,0,0,0,...Buffer.from("WEBPVP8X")],0);const wm=w-1,hm=h-1;b[24]=wm&255;b[25]=(wm>>8)&255;b[26]=(wm>>16)&255;b[27]=hm&255;b[28]=(hm>>8)&255;b[29]=(hm>>16)&255;return b;}

describe("production reference images",()=>{
 it("accepts PNG",()=>expect(inspectProductionReferenceImage(png(),"image/png")).toMatchObject({width:32,height:16,extension:"png"}));
 it("accepts JPEG",()=>expect(inspectProductionReferenceImage(jpeg(),"image/jpeg")).toMatchObject({width:32,height:16,extension:"jpg"}));
 it("accepts WEBP",()=>expect(inspectProductionReferenceImage(webp(),"image/webp")).toMatchObject({width:32,height:16,extension:"webp"}));
 it("rejects unsupported MIME",()=>expect(()=>inspectProductionReferenceImage(png(),"image/gif")).toThrow("UNSUPPORTED_REFERENCE_MIME"));
 it("rejects empty",()=>expect(()=>inspectProductionReferenceImage(new Uint8Array(),"image/png")).toThrow("REFERENCE_FILE_EMPTY"));
 it("rejects oversized",()=>expect(()=>inspectProductionReferenceImage(new Uint8Array(MAX_PRODUCTION_REFERENCE_BYTES+1),"image/png")).toThrow("REFERENCE_FILE_TOO_LARGE"));
 it("rejects malformed PNG",()=>expect(()=>inspectProductionReferenceImage(new Uint8Array(24),"image/png")).toThrow("INVALID_REFERENCE_IMAGE"));
 it("rejects malformed JPEG",()=>expect(()=>inspectProductionReferenceImage(new Uint8Array(21),"image/jpeg")).toThrow("INVALID_REFERENCE_IMAGE"));
 it("rejects malformed WEBP",()=>expect(()=>inspectProductionReferenceImage(new Uint8Array(30),"image/webp")).toThrow("INVALID_REFERENCE_IMAGE"));
 it("checksum is deterministic",()=>expect(referenceChecksum(png())).toBe(referenceChecksum(png())));
 it("checksum changes with bytes",()=>expect(referenceChecksum(png(32,16))).not.toBe(referenceChecksum(png(31,16))));
 it("checksum is sha256",()=>expect(referenceChecksum(png())).toMatch(/^[a-f0-9]{64}$/));
 it("storage path is immutable",()=>expect(referenceStoragePath({creatorId:"u",seriesId:"s",referenceId:"r",checksum:"abc",extension:"png"})).toBe("users/u/series/s/references/r/abc.png"));
 it("storage path ignores creator filename",()=>expect(referenceStoragePath({creatorId:"u",seriesId:"s",referenceId:"r",checksum:"abc",extension:"png"})).not.toContain("portrait-final"));
});
