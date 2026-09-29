import {NextRequest} from "next/server";
import {afterAll,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/motion/jobs/processMotionClipJob",()=>({processMotionClipJob:vi.fn(async()=>"COMPLETED")}));
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {processMotionClipJob} from "@/lib/motion/jobs/processMotionClipJob";
import {GET} from "../route";
const old=process.env.CRON_SECRET;
beforeEach(()=>{vi.resetAllMocks();process.env.CRON_SECRET="secret";vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[{id:"j",claim_token:"c"}],error:null}))} as any);});
afterAll(()=>{process.env.CRON_SECRET=old;});
describe("motion worker endpoint",()=>{
 it("rejects missing secret",async()=>expect((await GET(new NextRequest("http://x"))).status).toBe(401));
 it("rejects incorrect secret",async()=>expect((await GET(new NextRequest("http://x",{headers:{authorization:"Bearer wrong"}}))).status).toBe(401));
 it("claims one durable job",async()=>{expect((await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}))).status).toBe(200);expect(processMotionClipJob).toHaveBeenCalledTimes(1);});
 it("handles empty queue",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[],error:null}))} as any);const b=await (await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}))).json();expect(b.processed).toBe(0);});
});
