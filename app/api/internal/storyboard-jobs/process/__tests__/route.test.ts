import {NextRequest} from "next/server";
import {afterAll,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/storyboards/jobs/processStoryboardPanelJob",()=>({processStoryboardPanelJob:vi.fn(async()=>"COMPLETED")}));
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {processStoryboardPanelJob} from "@/lib/storyboards/jobs/processStoryboardPanelJob";
import {GET} from "../route";
const old=process.env.CRON_SECRET;
beforeEach(()=>{vi.resetAllMocks();process.env.CRON_SECRET="secret";vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[{id:"j",claim_token:"c"}],error:null}))} as any);});
afterAll(()=>{process.env.CRON_SECRET=old;});
describe("storyboard worker endpoint",()=>{
 it("rejects missing secret",async()=>expect((await GET(new NextRequest("http://x"))).status).toBe(401));
 it("rejects incorrect secret",async()=>expect((await GET(new NextRequest("http://x",{headers:{authorization:"Bearer wrong"}}))).status).toBe(401));
 it("claims and processes one durable job",async()=>{const r=await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}));expect(r.status).toBe(200);expect(processStoryboardPanelJob).toHaveBeenCalledTimes(1);});
 it("returns zero work when queue is empty",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[],error:null}))} as any);const r=await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}));const b=await r.json();expect(b.processed).toBe(0);});
});