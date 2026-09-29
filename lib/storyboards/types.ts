export type StoryboardStatus="DRAFT"|"GENERATING"|"READY"|"PARTIAL"|"FAILED"|"ARCHIVED";
export type PanelGenerationStatus="PENDING"|"GENERATING"|"COMPLETED"|"FAILED";
export type FramingIntent="ESTABLISHING"|"WIDE"|"MEDIUM"|"CLOSE"|"DETAIL"|"REACTION"|"INSERT";

export type StoryboardAsset={url:string;storagePath:string;width:number;height:number;mimeType:string};

export type StoryboardPanel={
  id:string;sourceVisualBeatId:string;sourceScriptBlockIds:string[];sequenceIndex:number;
  purpose:string;moment:string;characterIds:string[];locationId:string|null;framingIntent:FramingIntent;
  composition:string;staging:string;emotionalFocus:string;continuityRequirements:string[];
  appearanceRequirements:Array<{characterId:string;requirements:string[]}>;
  environmentRequirements:string[];generationStatus:PanelGenerationStatus;asset:StoryboardAsset|null;
};

export type StoryboardBlueprint={
  id:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;version:number;
  identity:{title:string};panels:StoryboardPanel[];
  continuityChecks:{protectedCanon:string[];protectedMysteries:string[];characterConsistency:string[];environmentConsistency:string[]};
  confidence:{overall:number;assumptions:string[]};
};

export type PanelGenerationSpec={
  panelId:string;seriesId:string;sceneId:string;storyboardId:string;
  creativeDirection:{visualStyleDescription:string;visualTags:string[];colorLanguage:string;lighting:string;animationLanguage:string};
  panel:{framingIntent:FramingIntent;composition:string;staging:string;emotionalFocus:string};
  characters:Array<{characterId:string;name:string;visualConcept:string;visualDescription:string;continuityRequirements:string[]}>;
  environment:{locationId:string|null;locationName:string|null;description:string|null;visualTags:string[];requirements:string[]};
  protectedConstraints:string[];
};

export type CompiledStoryboardPanelPrompt={prompt:string;negativeConstraints:string[];promptVersion:"1.0";promptChecksum:string};

export type StoryboardPanelState={panelId:string;status:PanelGenerationStatus;asset:StoryboardAsset|null;errorCode:string|null;retryCount:number};
