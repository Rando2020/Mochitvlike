import {afterEach,describe,expect,it,vi} from "vitest";
import {ElevenLabsMusicProvider,ElevenLabsSoundEffectProvider} from "../providers/elevenlabs";
import {EnvironmentSoundLibraryProvider} from "../library";
import {TechnicalMusicQualityValidator,TechnicalSoundEffectQualityValidator} from "../quality";
import {SoundProviderRefusalError,SoundProviderTimeoutError} from "../providers/errors";
import {buildValidSound} from "./fixtures";

afterEach(()=>{vi.restoreAllMocks();delete process.env.ELEVENLABS_API_KEY;});
describe("ElevenLabs providers",()=>{
 it("music uses v2.5 and instrumental duration-bounded request",async()=>{process.env.ELEVENLABS_API_KEY="x";const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array(500),{status:200,headers:{"content-type":"audio/mpeg"}}));const p=new ElevenLabsMusicProvider();await p.generate({prompt:"safe orchestral",durationSeconds:12});const body=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));expect(fetchMock.mock.calls[0][0]).toContain("/v1/music");expect(body.model_id).toBe("music_v2_5");expect(body.force_instrumental).toBe(true);expect(body.music_length_ms).toBe(12000);});
 it("music clamps to provider minimum",async()=>{process.env.ELEVENLABS_API_KEY="x";vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array(500),{status:200,headers:{"content-type":"audio/mpeg"}}));expect((await new ElevenLabsMusicProvider().generate({prompt:"x",durationSeconds:1})).durationSeconds).toBe(3);});
 it("SFX uses sound v2 and bounded duration",async()=>{process.env.ELEVENLABS_API_KEY="x";const f=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array(500),{status:200,headers:{"content-type":"audio/mpeg"}}));await new ElevenLabsSoundEffectProvider().generate({prompt:"door closes",durationSeconds:2,loop:false});const body=JSON.parse(String(f.mock.calls[0][1]?.body));expect(body.model_id).toBe("eleven_text_to_sound_v2");expect(body.duration_seconds).toBe(2);expect(body.loop).toBe(false);});
 it("ambience can request loop",async()=>{process.env.ELEVENLABS_API_KEY="x";const f=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array(500),{status:200,headers:{"content-type":"audio/mpeg"}}));await new ElevenLabsSoundEffectProvider().generate({prompt:"rain",durationSeconds:30,loop:true});expect(JSON.parse(String(f.mock.calls[0][1]?.body)).loop).toBe(true);});
 it("400 maps to refusal",async()=>{process.env.ELEVENLABS_API_KEY="x";vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("bad",{status:400}));await expect(new ElevenLabsMusicProvider().generate({prompt:"x",durationSeconds:5})).rejects.toThrow(SoundProviderRefusalError);});
 it("abort maps to timeout",async()=>{process.env.ELEVENLABS_API_KEY="x";const e:any=new Error("abort");e.name="AbortError";vi.spyOn(globalThis,"fetch").mockRejectedValue(e);await expect(new ElevenLabsSoundEffectProvider().generate({prompt:"x",durationSeconds:1,loop:false})).rejects.toThrow(SoundProviderTimeoutError);});
 it("rejects tiny response",async()=>{process.env.ELEVENLABS_API_KEY="x";vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(new Uint8Array(10),{status:200,headers:{"content-type":"audio/mpeg"}}));await expect(new ElevenLabsMusicProvider().generate({prompt:"x",durationSeconds:5})).rejects.toThrow();});
});
describe("Sound library",()=>{
 it("resolves configured generic effect",async()=>{const f=buildValidSound(),cue=f.soundPlan.cues.find(c=>c.type==="SFX")!;const manifest=JSON.stringify([{key:"door",url:"https://example.com/door.mp3",storagePath:"library/door.mp3",mimeType:"audio/mpeg",durationSeconds:1,loopable:false,match:{type:"SFX",label:"door closes"}}]);expect((await new EnvironmentSoundLibraryProvider(manifest).resolve(cue))?.key).toBe("door");});
 it("does not fake missing library asset",async()=>{const f=buildValidSound(),cue=f.soundPlan.cues.find(c=>c.type==="SFX")!;expect(await new EnvironmentSoundLibraryProvider("[]").resolve(cue)).toBeNull();});
 it("never resolves MUSIC through generic library",async()=>{const f=buildValidSound(),cue=f.soundPlan.cues.find(c=>c.type==="MUSIC")!;expect(await new EnvironmentSoundLibraryProvider("[]").resolve(cue)).toBeNull();});
});
describe("Technical quality boundary",()=>{
 const good={bytes:new Uint8Array(500),mimeType:"audio/mpeg" as const,durationSeconds:3,durationSource:"REQUESTED" as const,provider:"x",model:"x"};
 it("music accepts non-empty expected container",async()=>expect((await new TechnicalMusicQualityValidator().validate({audio:good})).ok).toBe(true));
 it("effects accept non-empty expected container",async()=>expect((await new TechnicalSoundEffectQualityValidator().validate({audio:good})).ok).toBe(true));
 it("rejects empty bytes",async()=>expect((await new TechnicalMusicQualityValidator().validate({audio:{...good,bytes:new Uint8Array()}})).ok).toBe(false));
 it("does not claim perceptual quality",async()=>{const q=await new TechnicalMusicQualityValidator().validate({audio:good});expect(q.checks.join(" ")).not.toMatch(/cinematic|emotional|musical quality|mix quality/i);});
});
