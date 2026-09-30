import type {SceneBlueprint} from "@/lib/scenes/types";
import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";

export type SoundPlanStatus="DRAFT"|"GENERATING"|"READY"|"PARTIAL"|"FAILED"|"ARCHIVED";
export type SoundGenerationStatus="PENDING"|"GENERATING"|"COMPLETED"|"FAILED"|"SKIPPED"|"LIBRARY";
export type SoundCueType="MUSIC"|"AMBIENCE"|"SFX"|"FOLEY"|"SILENCE";
export type SoundPriority="BACKGROUND"|"NORMAL"|"FOREGROUND";
export type MusicPurpose="OPENING"|"TENSION"|"ACTION"|"EMOTIONAL"|"COMEDIC"|"MYSTERY"|"REVEAL"|"TRANSITION"|"CLOSING";
export type SourceReferenceType="SERIES_SOUND"|"SCENE"|"SCRIPT_BLOCK"|"VISUAL_BEAT"|"LOCATION"|"DIALOGUE_LINE";

export type SoundSourceReference={type:SourceReferenceType;id:string};

export type AudibleCueBase={
  id:string;
  type:Exclude<SoundCueType,"SILENCE">;
  startSeconds:number;
  durationSeconds:number;
  endSeconds:number;
  priority:SoundPriority;
  gainDb:number;
  fadeInSeconds:number;
  fadeOutSeconds:number;
  duckUnderDialogue:boolean;
  sourceReferences:SoundSourceReference[];
  storyPurpose:string;
  generationStatus:SoundGenerationStatus;
};

export type MusicCue=AudibleCueBase&{
  type:"MUSIC";
  mood:string;
  energy:number;
  purpose:MusicPurpose;
  musicDirection:string;
  recurringMotifIds:string[];
};

export type AmbienceCue=AudibleCueBase&{
  type:"AMBIENCE";
  environment:string;
  characteristics:string[];
  loopable:boolean;
};

export type SfxCue=AudibleCueBase&{
  type:"SFX";
  event:string;
  intensity:number;
  syncPointSeconds:number;
};

export type FoleyCue=AudibleCueBase&{
  type:"FOLEY";
  action:string;
  material:string|null;
  syncPointSeconds:number;
};

export type SilenceCue={
  id:string;
  type:"SILENCE";
  startSeconds:number;
  durationSeconds:number;
  endSeconds:number;
  sourceReferences:SoundSourceReference[];
  storyPurpose:string;
  reason:string;
};

export type SoundCue=MusicCue|AmbienceCue|SfxCue|FoleyCue|SilenceCue;

export type SoundAsset={
  url:string;
  storagePath:string;
  mimeType:"audio/mpeg";
  durationSeconds:number;
  durationSource:"REQUESTED";
  loopable:boolean;
};

export type SoundDesignPlan={
  id:string;
  seriesId:string;
  episodeAssemblyId:string;
  dialoguePlanId:string|null;
  version:number;
  cues:SoundCue[];
  validation:{
    visualTimingPreserved:boolean;
    dialogueTimingPreserved:boolean;
    cueCoverageSeconds:number;
    warnings:string[];
  };
  confidence:{overall:number;assumptions:string[]};
};

export type SoundCueState={
  cueId:string;
  status:SoundGenerationStatus;
  asset:SoundAsset|null;
  errorCode:string|null;
  retryCount:number;
};

export type MixClip={
  cueId:string;
  type:"DIALOGUE"|"MUSIC"|"AMBIENCE"|"EFFECT";
  startSeconds:number;
  durationSeconds:number;
  gainDb:number;
  duckedGainDb:number|null;
  loop:boolean;
  assetUrl:string|null;
};

export type MixTrack={id:"dialogue"|"music"|"ambience"|"effects";clips:MixClip[];muted:boolean};

export type EpisodeMixTimeline={
  durationSeconds:number;
  tracks:{dialogue:MixTrack;music:MixTrack;ambience:MixTrack;effects:MixTrack};
  masterPreviewGainDb:number;
};

export type SoundSceneContext={
  order:number;
  scene:SceneBlueprint;
  script:SceneScript;
  visualPlan:VisualPlan;
};

export type GeneratedSoundAudio={
  bytes:Uint8Array;
  mimeType:"audio/mpeg";
  durationSeconds:number;
  durationSource:"REQUESTED";
  provider:string;
  model:string;
};

export interface MusicGenerationProvider{
  readonly name:string;
  readonly model:string;
  generate(input:{prompt:string;durationSeconds:number;signal?:AbortSignal}):Promise<GeneratedSoundAudio>;
}
export interface SoundEffectProvider{
  readonly name:string;
  readonly model:string;
  generate(input:{prompt:string;durationSeconds:number;loop:boolean;signal?:AbortSignal}):Promise<GeneratedSoundAudio>;
}
export type LibrarySoundAsset={key:string;url:string;storagePath:string;mimeType:"audio/mpeg";durationSeconds:number;loopable:boolean};
export interface SoundLibraryProvider{resolve(cue:SoundCue):Promise<LibrarySoundAsset|null>;}

export type SoundQualityResult={ok:boolean;code:string|null;checks:string[]};
export interface MusicQualityValidator{validate(input:{audio:GeneratedSoundAudio}):Promise<SoundQualityResult>;}
export interface SoundEffectQualityValidator{validate(input:{audio:GeneratedSoundAudio}):Promise<SoundQualityResult>;}
