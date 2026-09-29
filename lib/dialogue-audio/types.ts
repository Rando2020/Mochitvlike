export type VoiceCastSource="AUTO_SELECTED"|"CREATOR_SELECTED";
export type DialoguePlanStatus="GENERATING"|"READY"|"PARTIAL"|"FAILED"|"ARCHIVED";
export type DialogueLineStatus="PENDING"|"GENERATING"|"COMPLETED"|"FAILED";
export type DialogueTimingFit="UNKNOWN"|"FITS"|"TOO_LONG"|"VERY_SHORT";

export type VoiceProfile={
  provider:"openai";
  providerVoiceId:string;
  displayName:string;
  descriptors:string[];
  language:string;
  accentDirection:string|null;
  speakingStyle:string;
  energy:string;
  emotionalRange:string;
};

export type VoiceAssignment={
  id:string;
  characterId:string;
  characterName:string;
  voiceProfile:VoiceProfile;
  source:VoiceCastSource;
};

export type VoiceCast={
  id:string;
  seriesId:string;
  episodeAssemblyId:string;
  version:number;
  assignments:VoiceAssignment[];
  confidence:{overall:number;assumptions:string[]};
};

export type DialogueAudioAsset={
  url:string;
  storagePath:string;
  mimeType:"audio/wav";
  durationSeconds:number;
  sampleRate:number;
  channels:number;
};

export type DialogueAudioLine={
  id:string;
  scriptBlockId:string;
  characterId:string;
  text:string;
  textChecksum:string;
  episodeStartSeconds:number;
  visualWindowSeconds:number;
  voiceAssignmentId:string;
  generationStatus:DialogueLineStatus;
  audioAsset:DialogueAudioAsset|null;
  timing:{naturalDurationSeconds:number|null;differenceSeconds:number|null;fit:DialogueTimingFit};
};

export type DialogueAudioPlan={
  id:string;
  seriesId:string;
  episodeAssemblyId:string;
  voiceCastId:string;
  version:number;
  lines:DialogueAudioLine[];
  validation:{allDialogueCovered:boolean;warnings:string[]};
  confidence:{overall:number;assumptions:string[]};
};

export type DialogueAudioSpec={
  lineId:string;
  characterId:string;
  text:string;
  textChecksum:string;
  voice:{providerVoiceId:string;speakingStyle:string;energy:string};
  timingContext:{episodeStartSeconds:number;visualWindowSeconds:number};
};

export type CompiledSpeechInstructions={instructions:string;version:"1.0";checksum:string};

export type GeneratedDialogueAudio={
  bytes:Uint8Array;
  mimeType:"audio/wav";
  durationSeconds:number;
  sampleRate:number;
  channels:number;
  provider:string;
  model:string;
};

export interface DialogueSpeechProvider{
  readonly name:string;
  readonly model:string;
  generate(input:{
    text:string;
    voiceId:string;
    instructions:string;
    responseFormat:"wav";
    signal?:AbortSignal;
  }):Promise<GeneratedDialogueAudio>;
}

export type DialogueAudioQualityResult={ok:boolean;code:string|null;checks:string[]};
export interface DialogueAudioQualityValidator{
  validate(input:{audio:GeneratedDialogueAudio}):Promise<DialogueAudioQualityResult>;
}
