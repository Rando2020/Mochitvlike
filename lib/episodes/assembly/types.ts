export type EpisodeAssemblyStatus="DRAFT"|"READY"|"ARCHIVED";
export type EpisodeMediaType="MOTION_VIDEO"|"STILL_HOLD";
export type EpisodeTransition="CUT"|"DISSOLVE"|"HOLD";

export type EpisodeTimelineDialogueCue={
  scriptBlockId:string;
  characterId:string;
  text:string;
  startSeconds:number;
  durationSeconds:number;
};

export type EpisodeTimelineClip={
  id:string;
  sourceAnimaticClipId:string;
  sourceMotionClipId:string;
  sequenceIndex:number;
  sourceVisualBeatId:string;
  sourceScriptBlockIds:string[];
  mediaType:EpisodeMediaType;
  asset:{
    url:string;
    storagePath:string;
    mimeType:string;
    width:number;
    height:number;
    sourceDurationSeconds:number|null;
  };
  startSeconds:number;
  durationSeconds:number;
  sourceOffsetSeconds:number;
  transitionIn:EpisodeTransition;
  transitionDurationSeconds:number;
  dialogueCues:EpisodeTimelineDialogueCue[];
  storyPurpose:string;
};

export type EpisodeTimelineScene={
  sceneId:string;
  order:number;
  startSeconds:number;
  durationSeconds:number;
  animaticId:string;
  motionPlanId:string;
  clips:EpisodeTimelineClip[];
};

export type EpisodeTimeline={
  id:string;
  seriesId:string;
  episodeKey:"episodeOne";
  version:number;
  identity:{title:string};
  targetDurationSeconds:number;
  scenes:EpisodeTimelineScene[];
  continuityChecks:{
    sourceSceneIds:string[];
    sourceAnimaticIds:string[];
    sourceMotionPlanIds:string[];
    protectedCanon:string[];
    protectedMysteries:string[];
  };
  validation:{
    hasVisualCoverage:boolean;
    hasScriptCoverage:boolean;
    durationDifferenceSeconds:number;
    warnings:string[];
  };
  confidence:{overall:number;assumptions:string[]};
};

export interface EpisodePreviewRenderer{
  render(timeline:EpisodeTimeline):Promise<{url:string;storagePath:string;mimeType:string}>;
}
