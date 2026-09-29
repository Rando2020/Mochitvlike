import {z} from "zod";
const id=z.string().min(1).max(120),text=z.string().max(5000);
const Asset=z.object({url:z.string().url(),storagePath:z.string().min(1),durationSeconds:z.number().positive(),width:z.number().int().positive(),height:z.number().int().positive(),mimeType:z.string().min(1)}).strict();
const InputAsset=z.object({url:z.string().url(),storagePath:z.string().min(1),width:z.number().int().positive(),height:z.number().int().positive(),mimeType:z.string().min(1)}).strict();
const Clip=z.object({
 id:z.string().uuid(),animaticClipId:z.string().uuid(),storyboardPanelId:z.string().uuid(),sequenceIndex:z.number().int().min(0),
 sourceVisualBeatId:id,sourceScriptBlockIds:z.array(id).min(1),inputAsset:InputAsset,targetDurationSeconds:z.number().positive(),
 motionIntent:z.object({camera:text,subjectMotion:text,environmentalMotion:text,emotionalIntent:text,continuityNotes:z.array(text)}).strict(),
 generationStatus:z.enum(["PENDING","GENERATING","COMPLETED","FAILED","SKIPPED"]),outputAsset:Asset.nullable()
}).strict();
export const MotionPlanSchema=z.object({
 id:z.string().uuid(),seriesId:z.string().uuid(),sceneId:z.string().uuid(),scriptId:z.string().uuid(),visualPlanId:z.string().uuid(),storyboardId:z.string().uuid(),animaticId:z.string().uuid(),version:z.number().int().min(1),
 identity:z.object({title:text}).strict(),clips:z.array(Clip).min(1),
 continuityChecks:z.object({characterRequirements:z.array(text),environmentRequirements:z.array(text),protectedCanon:z.array(id),protectedMysteries:z.array(id)}).strict(),
 confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(text)}).strict()
}).strict();
