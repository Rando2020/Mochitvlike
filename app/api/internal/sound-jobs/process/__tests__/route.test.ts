import {NextRequest} from "next/server";
import {afterAll,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/admin",()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock("@/lib/sound-design/jobs/processSoundJob",()=>({processSoundJob:vi.fn(async()=>"COMPLETED")}));
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {processSoundJob} from "@/lib/sound-design/jobs/processSoundJob";
import {GET} from "../route";
const old=process.env.CRON_SECRET;
beforeEach(()=>{vi.resetAllMocks();process.env.CRON_SECRET="secret";vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[{id:"j",claim_token:"c"}],error:null}))} as any);});
afterAll(()=>{process.env.CRON_SECRET=old;});
describe("sound worker route",()=>{
 it("rejects missing secret",async()=>expect((await GET(new NextRequest("http://x"))).status).toBe(401));
 it("rejects wrong secret",async()=>expect((await GET(new NextRequest("http://x",{headers:{authorization:"Bearer wrong"}}))).status).toBe(401));
 it("processes one job",async()=>{expect((await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}))).status).toBe(200);expect(processSoundJob).toHaveBeenCalledTimes(1);});
 it("handles empty queue",async()=>{vi.mocked(createAdminSupabaseClient).mockReturnValue({rpc:vi.fn(async()=>({data:[],error:null}))} as any);expect((await(await GET(new NextRequest("http://x",{headers:{authorization:"Bearer secret"}}))).json()).processed).toBe(0);});
});
