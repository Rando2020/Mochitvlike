import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {POST} from "../[storyboardId]/panels/[panelId]/retry/route";
const params={storyboardId:"sb",panelId:"p"};
function client(job:any,rpc:any={data:true,error:null}){const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:job,error:null})};return{auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})},from:()=>chain,rpc:vi.fn(async()=>rpc)} as any;}
describe("panel retry API",()=>{
 beforeEach(()=>vi.resetAllMocks());
 it("requeues failed panel",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"FAILED",retry_count:0}));const r=await POST(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve(params)});expect(r.status).toBe(202);});
 it("does not retry completed panel",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"COMPLETED",retry_count:0}));const r=await POST(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve(params)});expect(r.status).toBe(409);});
 it("returns 404 for foreign/missing panel",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(client(null));const r=await POST(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve(params)});expect(r.status).toBe(404);});
 it("enforces retry limit through RPC",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue(client({id:"j",status:"FAILED",retry_count:3},{data:false,error:null}));const r=await POST(new NextRequest("http://x",{method:"POST"}),{params:Promise.resolve(params)});expect(r.status).toBe(409);});
});