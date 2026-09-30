import {z} from "zod";
const id=z.string().min(1).max(160),text=z.string().min(1).max(4096);
const VoiceProfile=z.object({
  provider:z.literal("openai"),providerVoiceId:id,displayName:id,descriptors:z.array(id).max(8),
  language:id,accentDirection:z.string().max(120).nullable(),speakingStyle:id,energy:id,emotionalRange:id
}).strict();
export const VoiceCastSchema=z.object({
  id:z.string().uuid(),seriesId:z.string().uuid(),episodeAssemblyId:z.string().uuid(),version:z.number().int().min(1),
  assignments:z.array(z.object({
    id:id,characterId:id,characterName:id,voiceProfile:VoiceProfile,source:z.enum(["AUTO_SELECTED","CREATOR_SELECTED"])
  }).strict()).min(1),
  confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(z.string().max(1000))}).strict()
}).strict();
const AudioAsset=z.object({
  url:z.string().url(),storagePath:id,mimeType:z.literal("audio/wav"),durationSeconds:z.number().positive(),
  sampleRate:z.number().int().positive(),channels:z.number().int().positive()
}).strict();
export const DialogueAudioPlanSchema=z.object({
  id:z.string().uuid(),seriesId:z.string().uuid(),episodeAssemblyId:z.string().uuid(),voiceCastId:z.string().uuid(),version:z.number().int().min(1),
  lines:z.array(z.object({
    id:z.string().uuid(),scriptBlockId:id,characterId:id,text,textChecksum:z.string().regex(/^[a-f0-9]{64}$/),
    episodeStartSeconds:z.number().min(0),visualWindowSeconds:z.number().positive(),voiceAssignmentId:id,
    generationStatus:z.enum(["PENDING","GENERATING","COMPLETED","FAILED"]),audioAsset:AudioAsset.nullable(),
    timing:z.object({naturalDurationSeconds:z.number().positive().nullable(),differenceSeconds:z.number().nullable(),fit:z.enum(["UNKNOWN","FITS","TOO_LONG","VERY_SHORT"])}).strict()
  }).strict()).min(1),
  validation:z.object({allDialogueCovered:z.boolean(),warnings:z.array(z.string().max(1000))}).strict(),
  confidence:z.object({overall:z.number().min(0).max(1),assumptions:z.array(z.string().max(1000))}).strict()
}).strict();
