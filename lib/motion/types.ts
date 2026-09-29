export type MotionPlanStatus="DRAFT"|"GENERATING"|"READY"|"PARTIAL"|"FAILED"|"ARCHIVED";
export type MotionClipStatus="PENDING"|"GENERATING"|"COMPLETED"|"FAILED"|"SKIPPED";

export type MotionAsset={url:string;storagePath:string;durationSeconds:number;width:number;height:number;mimeType:string};

export type MotionPlanClip={
  id:string;animaticClipId:string;storyboardPanelId:string;sequenceIndex:number;
  sourceVisualBeatId:string;sourceScriptBlockIds:string[];
  inputAsset:{url:string;storagePath:string;width:number;height:number;mimeType:string};
  targetDurationSeconds:number;
  motionIntent:{camera:string;subjectMotion:string;environmentalMotion:string;emotionalIntent:string;continuityNotes:string[]};
  generationStatus:MotionClipStatus;outputAsset:MotionAsset|null;
};

export type MotionPlan={
  id:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;storyboardId:string;animaticId:string;version:number;
  identity:{title:string};clips:MotionPlanClip[];
  continuityChecks:{characterRequirements:string[];environmentRequirements:string[];protectedCanon:string[];protectedMysteries:string[]};
  confidence:{overall:number;assumptions:string[]};
};

export type MotionGenerationSpec={
  motionClipId:string;animaticClipId:string;
  inputImage:{url:string;width:number;height:number};
  durationSeconds:number;
  creativeDirection:{visualStyleDescription:string;colorLanguage:string;lighting:string;animationLanguage:string};
  characterConstraints:Array<{characterId:string;name:string;visualConcept:string;visualDescription:string;continuityRequirements:string[]}>;
  environmentConstraints:{locationId:string|null;description:string|null;visualTags:string[];continuityRequirements:string[]};
  motion:{camera:string;subject:string;environment:string;emotionalIntent:string};
  protectedConstraints:string[];
};

export type CompiledMotionPrompt={prompt:string;negativeConstraints:string[];promptVersion:"1.0";promptChecksum:string};

export type GeneratedMotionVideo={
  bytes:Uint8Array;mimeType:"video/mp4";durationSeconds:number;width:number;height:number;provider:string;model:string;providerTaskId:string;
};

export interface MotionVideoProvider{
  readonly name:string;
  readonly model:string;
  generate(input:{
    sourceImageUrl:string;prompt:string;negativeConstraints:string[];durationSeconds:number;aspectRatio:"16:9";signal?:AbortSignal;
    resumeTaskId?:string;onTaskCreated?:(taskId:string)=>Promise<void>;
  }):Promise<GeneratedMotionVideo>;
}

export type MotionClipState={motionClipId:string;status:MotionClipStatus;outputAsset:MotionAsset|null;errorCode:string|null;retryCount:number};

export type MotionQualityResult={ok:boolean;code:string|null;checks:string[]};
export interface MotionQualityValidator{validate(input:{video:GeneratedMotionVideo;expectedDurationSeconds:number}):Promise<MotionQualityResult>;}
