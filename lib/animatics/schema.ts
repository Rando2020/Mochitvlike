import {z} from "zod";
const id=z.string().trim().min(1).max(100),text=z.string().max(5000);
const Asset=z.object({url:z.string().url(),storagePath:z.string().min(1),width:z.number().int().positive(),height:z.number().int().positive(),mimeType:z.string().min(1)}).strict();
const DialogueCue=z.object({scriptBlockId:id,characterId:id,text,startOffsetSeconds:z.number().min(0),estimatedDurationSeconds:z.number().positive()}).strict();
const ActionCue=z.object({scriptBlockId:id,text}).strict();
const Clip=z.object({
 id:z.string().uuid(),panelId:z.string().uuid(),sequenceIndex:z.number().int().min(0),sourceVisualBeatId:id,sourceScriptBlockIds:z.array(id).min(1),
 asset:Asset,startSeconds:z.number().min(0),durationSeconds:z.number().positive(),
 transitionIn:z.enum(["CUT","HOLD","DISSOLVE"]),
 motionTreatment:z.enum(["STATIC","SLOW_PUSH","SLOW_PULL","PAN_LEFT","PAN_RIGHT","PAN_UP","PAN_DOWN"]),
 motionStrength:z.number().min(0).max(1),storyPurpose:text,emotionalFunction:text,
 dialogueCues:z.array(DialogueCue),actionCues:z.array(ActionCue)
}).strict();
export const AnimaticTimelineSchema=z.object({
 id:z.string().uuid(),seriesId:z.string().uuid(),sceneId:z.string().uuid(),scriptId:z.string().uuid(),visualPlanId:z.string().uuid(),storyboardId:z.string().uuid(),
 version:z.number().int().min(1),identity:z.object({title:text}).strict(),targetDurationSeconds:z.number().positive(),
 clips:z.array(Clip).min(1),
 pacingChecks:z.object({scriptDurationSeconds:z.number().positive(),timelineDurationSeconds:z.number().positive(),differenceSeconds:z.number(),warnings:z.array(text)}).strict(),
 confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(text)}).strict()
}).strict();
