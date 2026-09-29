import {z} from "zod";
const id=z.string().min(1).max(120),text=z.string().max(5000);
const Cue=z.object({
  scriptBlockId:id,characterId:id,text,startSeconds:z.number().min(0),durationSeconds:z.number().positive()
}).strict();
const Asset=z.object({
  url:z.string().url(),storagePath:z.string().min(1),mimeType:z.string().min(1),
  width:z.number().int().positive(),height:z.number().int().positive(),sourceDurationSeconds:z.number().positive().nullable()
}).strict();
const Clip=z.object({
  id:z.string().uuid(),sourceAnimaticClipId:z.string().uuid(),sourceMotionClipId:z.string().uuid(),
  sequenceIndex:z.number().int().min(0),sourceVisualBeatId:id,sourceScriptBlockIds:z.array(id).min(1),
  mediaType:z.enum(["MOTION_VIDEO","STILL_HOLD"]),asset:Asset,startSeconds:z.number().min(0),durationSeconds:z.number().positive(),
  sourceOffsetSeconds:z.number().min(0),transitionIn:z.enum(["CUT","DISSOLVE","HOLD"]),
  transitionDurationSeconds:z.number().min(0).max(.5),dialogueCues:z.array(Cue),storyPurpose:text
}).strict();
const Scene=z.object({
  sceneId:z.string().uuid(),order:z.number().int().min(0),startSeconds:z.number().min(0),durationSeconds:z.number().positive(),
  animaticId:z.string().uuid(),motionPlanId:z.string().uuid(),clips:z.array(Clip).min(1)
}).strict();

export const EpisodeTimelineSchema=z.object({
  id:z.string().uuid(),seriesId:z.string().uuid(),episodeKey:z.literal("episodeOne"),version:z.number().int().min(1),
  identity:z.object({title:text}).strict(),targetDurationSeconds:z.number().positive(),scenes:z.array(Scene).min(1),
  continuityChecks:z.object({
    sourceSceneIds:z.array(z.string().uuid()),sourceAnimaticIds:z.array(z.string().uuid()),sourceMotionPlanIds:z.array(z.string().uuid()),
    protectedCanon:z.array(id),protectedMysteries:z.array(id)
  }).strict(),
  validation:z.object({
    hasVisualCoverage:z.boolean(),hasScriptCoverage:z.boolean(),durationDifferenceSeconds:z.number(),warnings:z.array(text)
  }).strict(),
  confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(text)}).strict()
}).strict();
