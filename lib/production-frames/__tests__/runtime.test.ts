import {describe,expect,it,vi} from "vitest";
import {validateProductionFrameOutput} from "../quality";
import {productionFrameStoragePath} from "../storage";
import type {ProductionFrameGenerationSpec,GeneratedProductionFrame} from "../types";
import {HttpProductionFrameProvider} from "../provider";

function png(width:number,height:number){
 const bytes=new Uint8Array(24);[137,80,78,71,13,10,26,10].forEach((v,i)=>bytes[i]=v);bytes.set([0,0,0,13,73,72,68,82],8);
 const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);return bytes;
}
const minimalSpec={
 id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",seriesId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",sceneId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",scriptId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",visualPlanId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",storyboardId:"ffffffff-ffff-4fff-8fff-ffffffffffff",storyboardPanelId:"11111111-1111-4111-8111-111111111111",
 model:{modelId:"m",revision:"rev",architecture:"SDXL",developmentOverride:true},output:{width:64,height:64,aspectRatio:"64:64"},
 creativeDirection:{visualStyleDescription:"style",colorLanguage:"color",lightingLanguage:"light",animationLanguage:"animation",cameraLanguage:"camera"},
 composition:{shotSize:"MEDIUM",cameraAngle:"eye",framing:"frame",focalCharacterIds:[],supportingCharacterIds:[],environment:null},characters:[],performance:{characterPerformanceContexts:[]},abilityConstraints:[],
 environment:{locationId:null,description:null,visualTags:[],continuityRequirements:[]},canonicalConstraints:["canon"],variableShotDirection:["shot"],references:[],seed:1,promptVersion:"1.0",promptChecksum:"a".repeat(64)
} satisfies ProductionFrameGenerationSpec;

describe("quality and storage",()=>{
 it("accepts valid PNG dimensions",()=>expect(validateProductionFrameOutput(minimalSpec,{bytes:png(64,64),mimeType:"image/png",width:64,height:64}).ok).toBe(true));
 it("rejects empty output",()=>expect(validateProductionFrameOutput(minimalSpec,{bytes:new Uint8Array(),mimeType:"image/png",width:64,height:64})).toMatchObject({ok:false,code:"EMPTY_IMAGE"}));
 it("rejects unsupported mime",()=>expect(validateProductionFrameOutput(minimalSpec,{bytes:png(64,64),mimeType:"image/jpeg",width:64,height:64})).toMatchObject({ok:false,code:"UNSUPPORTED_IMAGE_MIME"}));
 it("rejects malformed PNG",()=>expect(validateProductionFrameOutput(minimalSpec,{bytes:new Uint8Array(24),mimeType:"image/png",width:64,height:64})).toMatchObject({ok:false,code:"INVALID_IMAGE_BYTES"}));
 it("rejects dimension mismatch",()=>expect(validateProductionFrameOutput(minimalSpec,{bytes:png(32,64),mimeType:"image/png",width:32,height:64})).toMatchObject({ok:false,code:"IMAGE_DIMENSION_MISMATCH"}));
 it("rejects benchmark reference at quality gate",()=>{const s={...minimalSpec,references:[{id:"r",type:"CHARACTER" as const,assetUrl:"x",checksum:"a".repeat(64),source:"SYNTHETIC" as const,approved:false,benchmarkOnly:true,creatorApproved:false,characterId:"c",abilityId:null,modelCompatibility:[]}]};expect(validateProductionFrameOutput(s,{bytes:png(64,64),mimeType:"image/png",width:64,height:64})).toMatchObject({ok:false,code:"REFERENCE_PROVENANCE_INVALID"});});
 it("uses attempt-specific storage path",()=>expect(productionFrameStoragePath({creatorId:"u",seriesId:"s",storyboardId:"sb",frameId:"f",generationId:"g",attemptId:"a"})).toBe("users/u/series/s/storyboards/sb/frames/f/g/a.png"));
 it("storage path ignores creator filenames",()=>expect(productionFrameStoragePath({creatorId:"u",seriesId:"s",storyboardId:"sb",frameId:"f",generationId:"g",attemptId:"a"})).not.toContain("filename"));
});

describe("HTTP provider boundary",()=>{
 it("fails closed when inference endpoint missing",async()=>{const p=new HttpProductionFrameProvider(undefined,undefined);await expect(p.generate(minimalSpec)).rejects.toThrow("PRODUCTION_FRAME_PROVIDER_NOT_CONFIGURED");});
 it("does not expose token in provider identity",()=>{const p=new HttpProductionFrameProvider("https://example.com","secret");expect(JSON.stringify({name:p.name,architecture:p.architecture})).not.toContain("secret");});
 it("has provider-neutral identity",()=>expect(new HttpProductionFrameProvider("https://example.com").architecture).toBe("MULTI"));
});
