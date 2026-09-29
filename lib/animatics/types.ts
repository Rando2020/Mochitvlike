export type AnimaticStatus="DRAFT"|"READY"|"ARCHIVED";
export type AnimaticTransition="CUT"|"HOLD"|"DISSOLVE";
export type MotionTreatment="STATIC"|"SLOW_PUSH"|"SLOW_PULL"|"PAN_LEFT"|"PAN_RIGHT"|"PAN_UP"|"PAN_DOWN";

export type AnimaticAsset={url:string;storagePath:string;width:number;height:number;mimeType:string};

export type DialogueCue={
  scriptBlockId:string;characterId:string;text:string;startOffsetSeconds:number;estimatedDurationSeconds:number;
};
export type ActionCue={scriptBlockId:string;text:string};

export type AnimaticClip={
  id:string;panelId:string;sequenceIndex:number;sourceVisualBeatId:string;sourceScriptBlockIds:string[];
  asset:AnimaticAsset;startSeconds:number;durationSeconds:number;transitionIn:AnimaticTransition;
  motionTreatment:MotionTreatment;motionStrength:number;storyPurpose:string;emotionalFunction:string;
  dialogueCues:DialogueCue[];actionCues:ActionCue[];
};

export type AnimaticTimeline={
  id:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;storyboardId:string;version:number;
  identity:{title:string};targetDurationSeconds:number;clips:AnimaticClip[];
  pacingChecks:{scriptDurationSeconds:number;timelineDurationSeconds:number;differenceSeconds:number;warnings:string[]};
  confidence:{overall:number;assumptions:string[]};
};

export type AnimaticSummary={id:string;version:number;status:AnimaticStatus;timelineDurationSeconds:number;updatedAt:string};

export interface AnimaticPreviewRenderer{
  render(timeline:AnimaticTimeline):Promise<{url:string;storagePath:string;mimeType:string}>;
}
