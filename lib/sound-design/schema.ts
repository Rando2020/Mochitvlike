import {z} from "zod";
const ref=z.object({type:z.enum(["SERIES_SOUND","SCENE","SCRIPT_BLOCK","VISUAL_BEAT","LOCATION","DIALOGUE_LINE"]),id:z.string().min(1).max(200)}).strict();
const base={
 id:z.string().uuid(),startSeconds:z.number().min(0),durationSeconds:z.number().positive(),endSeconds:z.number().positive(),
 priority:z.enum(["BACKGROUND","NORMAL","FOREGROUND"]),gainDb:z.number().min(-60).max(12),fadeInSeconds:z.number().min(0).max(10),fadeOutSeconds:z.number().min(0).max(10),
 duckUnderDialogue:z.boolean(),sourceReferences:z.array(ref).min(1).max(12),storyPurpose:z.string().min(1).max(1000),
 generationStatus:z.enum(["PENDING","GENERATING","COMPLETED","FAILED","SKIPPED","LIBRARY"])
};
const music=z.object({...base,type:z.literal("MUSIC"),mood:z.string().min(1).max(200),energy:z.number().min(0).max(1),purpose:z.enum(["OPENING","TENSION","ACTION","EMOTIONAL","COMEDIC","MYSTERY","REVEAL","TRANSITION","CLOSING"]),musicDirection:z.string().min(1).max(1000),recurringMotifIds:z.array(z.string().min(1).max(100)).max(12)}).strict();
const ambience=z.object({...base,type:z.literal("AMBIENCE"),environment:z.string().min(1).max(240),characteristics:z.array(z.string().min(1).max(120)).max(12),loopable:z.boolean()}).strict();
const sfx=z.object({...base,type:z.literal("SFX"),event:z.string().min(1).max(240),intensity:z.number().min(0).max(1),syncPointSeconds:z.number().min(0)}).strict();
const foley=z.object({...base,type:z.literal("FOLEY"),action:z.string().min(1).max(240),material:z.string().max(160).nullable(),syncPointSeconds:z.number().min(0)}).strict();
const silence=z.object({id:z.string().uuid(),type:z.literal("SILENCE"),startSeconds:z.number().min(0),durationSeconds:z.number().positive(),endSeconds:z.number().positive(),sourceReferences:z.array(ref).min(1).max(12),storyPurpose:z.string().min(1).max(1000),reason:z.string().min(1).max(500)}).strict();
export const SoundCueSchema=z.discriminatedUnion("type",[music,ambience,sfx,foley,silence]);
export const SoundDesignPlanSchema=z.object({
 id:z.string().uuid(),seriesId:z.string().uuid(),episodeAssemblyId:z.string().uuid(),dialoguePlanId:z.string().uuid().nullable(),version:z.number().int().min(1),
 cues:z.array(SoundCueSchema).max(80),
 validation:z.object({visualTimingPreserved:z.boolean(),dialogueTimingPreserved:z.boolean(),cueCoverageSeconds:z.number().min(0),warnings:z.array(z.string().max(1000)).max(50)}).strict(),
 confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(z.string().max(1000)).max(20)}).strict()
}).strict();
