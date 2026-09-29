import {z} from "zod";
const text=z.string().trim().min(1).max(3000),id=z.string().trim().min(1).max(100);
const Asset=z.object({url:text,storagePath:text,width:z.number().int().positive(),height:z.number().int().positive(),mimeType:text}).strict();
export const StoryboardBlueprintSchema=z.object({
 id:z.string().uuid(),seriesId:z.string().uuid(),sceneId:z.string().uuid(),scriptId:z.string().uuid(),visualPlanId:z.string().uuid(),version:z.number().int().min(1),
 identity:z.object({title:text}).strict(),
 panels:z.array(z.object({
  id:z.string().uuid(),sourceVisualBeatId:id,sourceScriptBlockIds:z.array(id).min(1),sequenceIndex:z.number().int().min(0),
  purpose:text,moment:text,characterIds:z.array(id),locationId:id.nullable(),
  framingIntent:z.enum(["ESTABLISHING","WIDE","MEDIUM","CLOSE","DETAIL","REACTION","INSERT"]),
  composition:text,staging:text,emotionalFocus:text,continuityRequirements:z.array(text),
  appearanceRequirements:z.array(z.object({characterId:id,requirements:z.array(text)}).strict()),
  environmentRequirements:z.array(text),generationStatus:z.enum(["PENDING","GENERATING","COMPLETED","FAILED"]),asset:Asset.nullable()
 }).strict()).min(1).max(8),
 continuityChecks:z.object({protectedCanon:z.array(id),protectedMysteries:z.array(id),characterConsistency:z.array(text),environmentConsistency:z.array(text)}).strict(),
 confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(text)}).strict()
}).strict();
