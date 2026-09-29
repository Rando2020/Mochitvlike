import {afterEach,describe,expect,it,vi} from "vitest";
import {RunwayMotionVideoProvider} from "../providers/runway";

afterEach(()=>{vi.unstubAllGlobals();delete process.env.RUNWAYML_API_SECRET;});
describe("Runway provider",()=>{
 it("creates image-to-video with documented landscape ratio",async()=>{
  process.env.RUNWAYML_API_SECRET="secret";
  const calls:any[]=[];
  vi.stubGlobal("fetch",vi.fn(async(input:any,init:any)=>{
    calls.push([String(input),init]);
    if(String(input).endsWith("/image_to_video"))return new Response(JSON.stringify({id:"task-1"}),{status:200,headers:{"Content-Type":"application/json"}});
    if(String(input).includes("/tasks/task-1"))return new Response(JSON.stringify({id:"task-1",status:"SUCCEEDED",output:["https://example.com/out.mp4"]}),{status:200,headers:{"Content-Type":"application/json"}});
    return new Response(new Uint8Array(2048),{status:200,headers:{"Content-Type":"video/mp4"}});
  }));
  const p=new RunwayMotionVideoProvider();
  await p.generate({sourceImageUrl:"https://example.com/frame.png",prompt:"move",negativeConstraints:[],durationSeconds:3.2,aspectRatio:"16:9"});
  const body=JSON.parse(calls[0][1].body);
  expect(body.ratio).toBe("1280:720");expect(body.duration).toBe(4);expect(body.model).toBe("gen4.5");
 });
 it("resumes existing provider task without creating another",async()=>{
  process.env.RUNWAYML_API_SECRET="secret";
  const fetcher=vi.fn(async(input:any)=>{
    if(String(input).includes("/tasks/task-existing"))return new Response(JSON.stringify({id:"task-existing",status:"SUCCEEDED",output:["https://example.com/out.mp4"]}),{status:200,headers:{"Content-Type":"application/json"}});
    if(String(input)==="https://example.com/out.mp4")return new Response(new Uint8Array(2048),{status:200});
    throw new Error("create should not run");
  });
  vi.stubGlobal("fetch",fetcher);
  await new RunwayMotionVideoProvider().generate({sourceImageUrl:"https://example.com/frame.png",prompt:"move",negativeConstraints:[],durationSeconds:4,aspectRatio:"16:9",resumeTaskId:"task-existing"});
  expect(fetcher.mock.calls.some(c=>String(c[0]).endsWith("/image_to_video"))).toBe(false);
 });
 it("persists task identity via callback",async()=>{
  process.env.RUNWAYML_API_SECRET="secret";const created=vi.fn(async()=>{});
  vi.stubGlobal("fetch",vi.fn(async(input:any)=>{
    if(String(input).endsWith("/image_to_video"))return new Response(JSON.stringify({id:"task-2"}),{status:200,headers:{"Content-Type":"application/json"}});
    if(String(input).includes("/tasks/task-2"))return new Response(JSON.stringify({id:"task-2",status:"SUCCEEDED",output:["https://example.com/out.mp4"]}),{status:200,headers:{"Content-Type":"application/json"}});
    return new Response(new Uint8Array(2048),{status:200});
  }));
  await new RunwayMotionVideoProvider().generate({sourceImageUrl:"https://example.com/frame.png",prompt:"move",negativeConstraints:[],durationSeconds:4,aspectRatio:"16:9",onTaskCreated:created});
  expect(created).toHaveBeenCalledWith("task-2");
 });
});
