import {describe,expect,it} from "vitest";
import {buildValidSound} from "./fixtures";
import {compileSoundDesignPlan} from "../compileSoundDesignPlan";
import {validateSoundDesignPlan} from "../validateSoundDesignPlan";
import {buildEpisodeMixTimeline} from "../mix";
import {buildMusicGenerationPrompt,buildEffectGenerationPrompt} from "../prompts";

describe("Sound Design compiler",()=>{
 it("consumes Episode duration",()=>{const f=buildValidSound();expect(f.soundPlan.cues.every(c=>c.endSeconds<=f.episodeTimeline.targetDurationSeconds+.001)).toBe(true);});
 it("consumes Dialogue timing for ducking",()=>{const f=buildValidSound();expect(f.soundPlan.cues.some(c=>c.type==="MUSIC"&&c.duckUnderDialogue)).toBe(true);});
 it("consumes Creative DNA musicDirection",()=>{const f=buildValidSound();expect(f.soundPlan.cues.find(c=>c.type==="MUSIC"&&c.musicDirection===f.series.creativeDNA.sound.musicDirection)).toBeTruthy();});
 it("maps recurring motifs",()=>{const f=buildValidSound();const cue=f.soundPlan.cues.find(c=>c.type==="MUSIC");if(cue?.type==="MUSIC")expect(cue.recurringMotifIds.length).toBe(f.series.creativeDNA.sound.recurringMotifs.length);});
 it("creates SFX only from explicit action",()=>{const f=buildValidSound();const cue=f.soundPlan.cues.find(c=>c.type==="SFX");expect(cue&&cue.sourceReferences.some(r=>r.type==="SCRIPT_BLOCK"&&r.id==="block_1")).toBeTruthy();});
 it("does not invent unsupported explosion",()=>{const f=buildValidSound();expect(f.soundPlan.cues.some(c=>c.type==="SFX"&&c.event==="explosion")).toBe(false);});
 it("source refs are valid",()=>{const f=buildValidSound();expect(validateSoundDesignPlan({plan:f.soundPlan,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}]}).success).toBe(true);});
 it("music timing is valid",()=>{const f=buildValidSound();const c=f.soundPlan.cues.find(c=>c.type==="MUSIC")!;expect(c.durationSeconds).toBeGreaterThanOrEqual(3);expect(c.endSeconds).toBeCloseTo(c.startSeconds+c.durationSeconds);});
 it("ambience timing is valid",()=>{const f=buildValidSound();const c=f.soundPlan.cues.find(c=>c.type==="AMBIENCE")!;expect(c.endSeconds).toBeCloseTo(c.startSeconds+c.durationSeconds);});
 it("SFX sync point is inside cue",()=>{const f=buildValidSound();const c=f.soundPlan.cues.find(c=>c.type==="SFX");if(c?.type==="SFX"){expect(c.syncPointSeconds).toBeGreaterThanOrEqual(c.startSeconds);expect(c.syncPointSeconds).toBeLessThanOrEqual(c.endSeconds);}});
 it("PAUSE creates intentional silence",()=>{const f=buildValidSound();expect(f.soundPlan.cues.some(c=>c.type==="SILENCE"&&c.sourceReferences.some(r=>r.id==="block_5"))).toBe(true);});
 it("cue IDs are deterministic",()=>{const a=buildValidSound(),b=compileSoundDesignPlan({planId:a.soundPlan.id,series:a.series,episode:a.episodeTimeline,dialogue:a.plan,scenes:[{order:0,scene:a.scene,script:a.script,visualPlan:a.visualPlan}],version:1});expect(b.cues.map(c=>c.id)).toEqual(a.soundPlan.cues.map(c=>c.id));});
 it("duplicate effects are prevented",()=>{const f=buildValidSound();const keys=f.soundPlan.cues.filter(c=>c.type==="SFX"||c.type==="FOLEY").map(c=>c.type+":"+("event" in c?c.event:"action" in c?c.action:"")+":"+c.startSeconds.toFixed(1));expect(new Set(keys).size).toBe(keys.length);});
 it("music energy normalized",()=>{const f=buildValidSound();const c=f.soundPlan.cues.find(c=>c.type==="MUSIC");if(c?.type==="MUSIC"){expect(c.energy).toBeGreaterThanOrEqual(0);expect(c.energy).toBeLessThanOrEqual(1);}});
 it("visual timing remains marked preserved",()=>expect(buildValidSound().soundPlan.validation.visualTimingPreserved).toBe(true));
 it("dialogue timing remains marked preserved",()=>expect(buildValidSound().soundPlan.validation.dialogueTimingPreserved).toBe(true));
 it("EpisodeTimeline is immutable",()=>{const f=buildValidSound(),before=JSON.stringify(f.episodeTimeline);compileSoundDesignPlan({planId:f.soundPlan.id,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}],version:1});expect(JSON.stringify(f.episodeTimeline)).toBe(before);});
 it("DialogueAudioPlan is immutable",()=>{const f=buildValidSound(),before=JSON.stringify(f.plan);compileSoundDesignPlan({planId:f.soundPlan.id,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}],version:1});expect(JSON.stringify(f.plan)).toBe(before);});
 it("Script is immutable",()=>{const f=buildValidSound(),before=JSON.stringify(f.script);compileSoundDesignPlan({planId:f.soundPlan.id,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}],version:1});expect(JSON.stringify(f.script)).toBe(before);});
 it("canon is immutable",()=>{const f=buildValidSound(),before=JSON.stringify(f.series.canon);compileSoundDesignPlan({planId:f.soundPlan.id,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}],version:1});expect(JSON.stringify(f.series.canon)).toBe(before);});
 it("music prompt excludes raw artist-like direction",()=>{const f=buildValidSound();f.series.creativeDNA.sound.musicDirection="cinematic orchestral in the style of Taylor Swift";const p=compileSoundDesignPlan({planId:f.soundPlan.id,series:f.series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene:f.scene,script:f.script,visualPlan:f.visualPlan}],version:1});const c=p.cues.find(c=>c.type==="MUSIC");if(c?.type==="MUSIC"){const prompt=buildMusicGenerationPrompt(c).prompt;expect(prompt).not.toMatch(/Taylor Swift/i);expect(prompt).toMatch(/No artist imitation/);}});
 it("effect prompt cannot add dialogue",()=>{const f=buildValidSound();const c=f.soundPlan.cues.find(c=>c.type==="SFX");if(c&&c.type==="SFX")expect(buildEffectGenerationPrompt(c).prompt).toMatch(/No music\. No voices\. No extra events/);});
});

describe("Mix timeline",()=>{
 it("uses Episode duration",()=>{const f=buildValidSound();expect(buildEpisodeMixTimeline({episode:f.episodeTimeline,dialogue:f.plan,plan:f.soundPlan,states:[]}).durationSeconds).toBe(f.episodeTimeline.targetDurationSeconds);});
 it("creates four tracks",()=>{const f=buildValidSound();expect(Object.keys(buildEpisodeMixTimeline({episode:f.episodeTimeline,dialogue:f.plan,plan:f.soundPlan,states:[]} ).tracks)).toEqual(["dialogue","music","ambience","effects"]);});
 it("music ducked gain is lower",()=>{const f=buildValidSound(),m=buildEpisodeMixTimeline({episode:f.episodeTimeline,dialogue:f.plan,plan:f.soundPlan,states:[]}).tracks.music.clips[0];expect(m.duckedGainDb===null||m.duckedGainDb<m.gainDb).toBe(true);});
 it("does not modify dialogue source files",()=>{const f=buildValidSound(),before=JSON.stringify(f.plan);buildEpisodeMixTimeline({episode:f.episodeTimeline,dialogue:f.plan,plan:f.soundPlan,states:[]});expect(JSON.stringify(f.plan)).toBe(before);});
});
