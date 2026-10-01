import {afterEach,describe,expect,it,vi} from "vitest";
import {HttpProductionFrameProvider} from "../provider";
import type {ProductionFrameGenerationSpec} from "../types";

const spec={
 id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",seriesId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",sceneId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",scriptId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",visualPlanId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",storyboardId:"ffffffff-ffff-4fff-8fff-ffffffffffff",storyboardPanelId:"11111111-1111-4111-8111-111111111111",
 model:{modelId:"animagine-xl-4.0",revision:"2b7c1b397761bf5bd3cc42e5b39ec99314a75a96",architecture:"SDXL",developmentOverride:true},output:{width:256,height:256,aspectRatio:"1:1"},
 creativeDirection:{visualStyleDescription:"style",colorLanguage:"color",lightingLanguage:"light",animationLanguage:"animation",cameraLanguage:"camera"},
 composition:{shotSize:"MEDIUM",cameraAngle:"eye",framing:"frame",focalCharacterIds:[],supportingCharacterIds:[],environment:null},characters:[],performance:{characterPerformanceContexts:[]},abilityConstraints:[],
 environment:{locationId:null,description:null,visualTags:[],continuityRequirements:[]},canonicalConstraints:["canon"],variableShotDirection:["shot"],references:[],seed:1,promptVersion:"1.0",promptChecksum:"a".repeat(64)
} satisfies ProductionFrameGenerationSpec;

afterEach(()=>vi.unstubAllGlobals());
describe("Visual Inference HTTP provider",()=>{
 it("requires token as well as endpoint",async()=>{await expect(new HttpProductionFrameProvider("https://gpu.example",undefined).generate(spec)).rejects.toThrow("PRODUCTION_FRAME_PROVIDER_NOT_CONFIGURED");});
 it("appends bounded service route",async()=>{
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({imageBase64:Buffer.from([1]).toString("base64"),mimeType:"image/png",width:256,height:256}),{status:200,headers:{"Content-Type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);
  await new HttpProductionFrameProvider("https://gpu.example/","secret").generate(spec);
  expect(fetchMock.mock.calls[0][0]).toBe("https://gpu.example/v1/production-frame");
 });
 it("preserves already-qualified route",async()=>{
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({imageBase64:Buffer.from([1]).toString("base64"),mimeType:"image/png",width:256,height:256}),{status:200,headers:{"Content-Type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);
  await new HttpProductionFrameProvider("https://gpu.example/v1/production-frame","secret").generate(spec);expect(fetchMock.mock.calls[0][0]).toBe("https://gpu.example/v1/production-frame");
 });
 it("sends server bearer token",async()=>{
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({imageBase64:Buffer.from([1]).toString("base64"),mimeType:"image/png",width:256,height:256}),{status:200,headers:{"Content-Type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);
  await new HttpProductionFrameProvider("https://gpu.example","secret").generate(spec);expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({Authorization:"Bearer secret"});
 });
 it("maps service timeout",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"INFERENCE_TIMEOUT"}}),{status:504,headers:{"Content-Type":"application/json"}})));await expect(new HttpProductionFrameProvider("https://gpu.example","secret").generate(spec)).rejects.toThrow("PRODUCTION_FRAME_PROVIDER_TIMEOUT");});
 it("maps bounded GPU error",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:"GPU_OOM"}}),{status:503,headers:{"Content-Type":"application/json"}})));await expect(new HttpProductionFrameProvider("https://gpu.example","secret").generate(spec)).rejects.toThrow("PRODUCTION_FRAME_PROVIDER_GPU_OOM");});
 it("rejects non-PNG success",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({imageBase64:"AA==",mimeType:"image/jpeg",width:256,height:256}),{status:200,headers:{"Content-Type":"application/json"}})));await expect(new HttpProductionFrameProvider("https://gpu.example","secret").generate(spec)).rejects.toThrow("PRODUCTION_FRAME_PROVIDER_MALFORMED");});
});
