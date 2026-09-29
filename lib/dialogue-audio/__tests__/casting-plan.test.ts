import {describe,expect,it} from "vitest";
import {buildValidEpisodeTimeline} from "@/lib/episodes/assembly/__tests__/fixtures";
import {buildVoiceCast} from "../selectVoiceCast";
import {compileDialogueAudioPlan} from "../compileDialogueAudioPlan";
import {buildDialogueAudioSpec} from "../buildDialogueAudioSpec";
import {compileSpeechInstructions} from "../compileSpeechInstructions";
import {checksumText} from "../checksums";
import {classifyDialogueTiming} from "../timing";
import {validateDialogueAudioPlan} from "../validateDialogueAudioPlan";
import {buildValidDialogue} from "./fixtures";

describe("Voice casting",()=>{
 it("consumes EpisodeTimeline dialogue",()=>{const f=buildValidDialogue();expect(f.plan.lines.length).toBe(f.episodeTimeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues)).length);});
 it("preserves exact dialogue",()=>{const f=buildValidDialogue();for(const line of f.plan.lines){const cue=f.episodeTimeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues)).find(c=>c.scriptBlockId===line.scriptBlockId);expect(line.text).toBe(cue?.text);}});
 it("detects speaking characters only",()=>{const f=buildValidDialogue();const speaking=new Set(f.episodeTimeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues.map(d=>d.characterId))));expect(new Set(f.voiceCast.assignments.map(a=>a.characterId))).toEqual(speaking);});
 it("excludes non-speaking cast",()=>{const f=buildValidDialogue();const speaking=new Set(f.voiceCast.assignments.map(a=>a.characterId));for(const member of f.series.cast)if(!f.episodeTimeline.scenes.some(s=>s.clips.some(c=>c.dialogueCues.some(d=>d.characterId===member.id))))expect(speaking.has(member.id)).toBe(false);});
 it("assignments are unique",()=>{const f=buildValidDialogue();expect(new Set(f.voiceCast.assignments.map(a=>a.characterId)).size).toBe(f.voiceCast.assignments.length);});
 it("assignments reference real cast",()=>{const f=buildValidDialogue();const ids=new Set(f.series.cast.map(c=>c.id));expect(f.voiceCast.assignments.every(a=>ids.has(a.characterId))).toBe(true);});
 it("ignores visual appearance for voice selection",()=>{const f=buildValidEpisodeTimeline(),a=buildVoiceCast({voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,series:f.series,timeline:f.episodeTimeline});const changed=structuredClone(f.series);changed.cast.forEach(c=>c.visualConcept="race ethnicity gender celebrity actor likeness");const b=buildVoiceCast({voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,series:changed,timeline:f.episodeTimeline});expect(b.assignments.map(x=>x.voiceProfile.providerVoiceId)).toEqual(a.assignments.map(x=>x.voiceProfile.providerVoiceId));});
 it("never creates celebrity likeness instructions",()=>{const f=buildValidDialogue();expect(JSON.stringify(f.voiceCast)).not.toMatch(/sounds exactly like|celebrity|actor likeness/i);});
 it("selection is deterministic",()=>{const f=buildValidEpisodeTimeline();const input={voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,series:f.series,timeline:f.episodeTimeline};expect(buildVoiceCast(input).assignments).toEqual(buildVoiceCast(input).assignments);});
});

describe("Dialogue plan",()=>{
 it("orders lines by Episode timestamp",()=>{const f=buildValidDialogue();expect(f.plan.lines.map(l=>l.episodeStartSeconds)).toEqual([...f.plan.lines].map(l=>l.episodeStartSeconds).sort((a,b)=>a-b));});
 it("preserves Episode start timestamps",()=>{const f=buildValidDialogue();for(const l of f.plan.lines){const cue=f.episodeTimeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues)).find(c=>c.scriptBlockId===l.scriptBlockId);expect(l.episodeStartSeconds).toBe(cue?.startSeconds);}});
 it("preserves visual windows",()=>{const f=buildValidDialogue();expect(f.plan.lines.every(l=>l.visualWindowSeconds>0)).toBe(true);});
 it("text checksum deterministic",()=>expect(checksumText("hello")).toBe(checksumText("hello")));
 it("text checksum changes with exact text",()=>expect(checksumText("hello")).not.toBe(checksumText("Hello")));
 it("instruction checksum deterministic",()=>{const f=buildValidDialogue(),s=buildDialogueAudioSpec(f.plan,f.voiceCast,f.plan.lines[0].id);expect(compileSpeechInstructions(s).checksum).toBe(compileSpeechInstructions(s).checksum);});
 it("instructions explicitly protect exact text",()=>{const f=buildValidDialogue(),s=buildDialogueAudioSpec(f.plan,f.voiceCast,f.plan.lines[0].id);expect(compileSpeechInstructions(s).instructions).toMatch(/exactly as written/i);});
 it("spec excludes runtime system prompt and private memory",()=>{const f=buildValidDialogue(),s=buildDialogueAudioSpec(f.plan,f.voiceCast,f.plan.lines[0].id);expect(JSON.stringify(s)).not.toMatch(/system_prompt|private memory/i);});
 it("same source yields same semantic plan",()=>{const a=buildValidDialogue(),b=compileDialogueAudioPlan({planId:a.plan.id,seriesId:a.plan.seriesId,episodeAssemblyId:a.plan.episodeAssemblyId,voiceCast:a.voiceCast,timeline:a.episodeTimeline,version:1});expect(b.lines.map(({id,...x})=>x)).toEqual(a.plan.lines.map(({id,...x})=>x));});
 it("valid plan passes cross-field validation",()=>{const f=buildValidDialogue();expect(validateDialogueAudioPlan({series:f.series,timeline:f.episodeTimeline,voiceCast:f.voiceCast,plan:f.plan}).success).toBe(true);});
 it("rewritten text fails validation",()=>{const f=buildValidDialogue();f.plan.lines[0].text+=" changed";expect(validateDialogueAudioPlan({series:f.series,timeline:f.episodeTimeline,voiceCast:f.voiceCast,plan:f.plan}).success).toBe(false);});
 it("wrong voice assignment fails validation",()=>{const f=buildValidDialogue();f.plan.lines[0].voiceAssignmentId="wrong";expect(validateDialogueAudioPlan({series:f.series,timeline:f.episodeTimeline,voiceCast:f.voiceCast,plan:f.plan}).success).toBe(false);});
 it("Episode timing is not mutated",()=>{const f=buildValidEpisodeTimeline(),before=JSON.stringify(f.episodeTimeline);const cast=buildVoiceCast({voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,series:f.series,timeline:f.episodeTimeline});compileDialogueAudioPlan({planId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,voiceCast:cast,timeline:f.episodeTimeline,version:1});expect(JSON.stringify(f.episodeTimeline)).toBe(before);});
 it("Series canon is not mutated",()=>{const f=buildValidEpisodeTimeline(),before=JSON.stringify(f.series.canon);const cast=buildVoiceCast({voiceCastId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,version:1,series:f.series,timeline:f.episodeTimeline});compileDialogueAudioPlan({planId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",seriesId:f.episodeTimeline.seriesId,episodeAssemblyId:f.episodeTimeline.id,voiceCast:cast,timeline:f.episodeTimeline,version:1});expect(JSON.stringify(f.series.canon)).toBe(before);});
});

describe("Timing fit",()=>{
 it("classifies FITS",()=>expect(classifyDialogueTiming(2.7,2.8).fit).toBe("FITS"));
 it("classifies TOO_LONG",()=>expect(classifyDialogueTiming(3.4,2.8).fit).toBe("TOO_LONG"));
 it("classifies VERY_SHORT",()=>expect(classifyDialogueTiming(1,3).fit).toBe("VERY_SHORT"));
 it("reports positive long difference",()=>expect(classifyDialogueTiming(3.4,2.8).differenceSeconds).toBeCloseTo(.6,5));
 it("does not retime the visual window",()=>{const f=buildValidDialogue(),w=f.plan.lines[0].visualWindowSeconds;classifyDialogueTiming(w+2,w);expect(f.plan.lines[0].visualWindowSeconds).toBe(w);});
});
