import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/storyboards/persistence",()=>({getStoryboard:vi.fn(),getPanelStates:vi.fn(),materializeStoryboard:vi.fn((b:any,s:any[])=>({...b,panels:b.panels.map((p:any)=>{const x=s.find(y=>y.panelId===p.id);return x?{...p,generationStatus:x.status,asset:x.asset}:p;})}))}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getStoryboard,getPanelStates} from "@/lib/storyboards/persistence";
import {GET} from "../[storyboardId]/route";
const params={seriesId:"s",sceneId:"c",scriptId:"sc",planId:"vp",storyboardId:"sb"};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})}} as any);vi.mocked(getStoryboard).mockResolvedValue({id:"sb",series_id:"s",scene_id:"c",script_id:"sc",visual_plan_id:"vp",status:"GENERATING",version:1,blueprint:{identity:{title:"Board"},panels:[{id:"p",sequenceIndex:0,purpose:"Purpose",moment:"Moment",characterIds:[],framingIntent:"WIDE",generationStatus:"PENDING",asset:null,composition:"Comp",staging:"Stage",emotionalFocus:"Emotion",sourceScriptBlockIds:["b"]}]}} as any);vi.mocked(getPanelStates).mockResolvedValue([{panelId:"p",status:"COMPLETED",asset:{url:"https://x",storagePath:"x",width:1536,height:1024,mimeType:"image/png"},errorCode:null,retryCount:0}] as any);});
describe("storyboard status API",()=>{
 it("returns safe panel status",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(params)});expect(r.status).toBe(200);const b=await r.json();expect(b.storyboard.panels[0].generationStatus).toBe("COMPLETED");});
 it("returns completed asset URL",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(params)});const b=await r.json();expect(b.storyboard.panels[0].asset.url).toBe("https://x");});
 it("does not expose prompt",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(params)});expect(JSON.stringify(await r.json())).not.toContain("prompt");});
 it("does not expose claim token or lease",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(params)});const t=JSON.stringify(await r.json());expect(t).not.toContain("claim_token");expect(t).not.toContain("lease_expires_at");});
 it("returns 404 for mismatched parent path",async()=>{const r=await GET(new NextRequest("http://x"),{params:Promise.resolve({...params,seriesId:"other"})});expect(r.status).toBe(404);});
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);const r=await GET(new NextRequest("http://x"),{params:Promise.resolve(params)});expect(r.status).toBe(401);});
});