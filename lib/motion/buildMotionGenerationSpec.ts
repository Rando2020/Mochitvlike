import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import type {MotionGenerationSpec,MotionPlan} from "./types";

export function buildMotionGenerationSpec(input:{
  series:SeriesBlueprint;scene:SceneBlueprint;visualPlan:VisualPlan;storyboard:StoryboardBlueprint;motionPlan:MotionPlan;motionClipId:string;
}):MotionGenerationSpec{
  const clip=input.motionPlan.clips.find(c=>c.id===input.motionClipId);
  if(!clip)throw new Error("MOTION_CLIP_NOT_FOUND");
  if(clip.generationStatus==="SKIPPED")throw new Error("MOTION_CLIP_SKIPPED");
  const panel=input.storyboard.panels.find(p=>p.id===clip.storyboardPanelId);
  if(!panel)throw new Error("MOTION_PANEL_NOT_FOUND");
  const castById=new Map(input.series.cast.map(c=>[c.id,c]));
  const location=panel.locationId?input.series.world.locations.find(l=>l.id===panel.locationId)??null:null;

  return{
    motionClipId:clip.id,
    animaticClipId:clip.animaticClipId,
    inputImage:{url:clip.inputAsset.url,width:clip.inputAsset.width,height:clip.inputAsset.height},
    durationSeconds:clip.targetDurationSeconds,
    creativeDirection:{
      visualStyleDescription:input.series.creativeDNA.visualStyle.description,
      colorLanguage:input.series.creativeDNA.visualStyle.colorLanguage,
      lighting:input.series.creativeDNA.visualStyle.lighting,
      animationLanguage:input.series.creativeDNA.visualStyle.animationLanguage
    },
    characterConstraints:panel.characterIds.map(id=>{
      const c=castById.get(id);
      if(!c)throw new Error("MOTION_CAST_REFERENCE_INVALID");
      return{
        characterId:id,
        name:c.name,
        visualConcept:c.visualConcept,
        visualDescription:c.characterSheetSeed.visualDescription,
        continuityRequirements:panel.appearanceRequirements.find(a=>a.characterId===id)?.requirements??[]
      };
    }),
    environmentConstraints:{
      locationId:location?.id??null,
      description:location?.description??null,
      visualTags:location?.visualTags??[],
      continuityRequirements:[...panel.environmentRequirements]
    },
    motion:{
      camera:clip.motionIntent.camera,
      subject:clip.motionIntent.subjectMotion,
      environment:clip.motionIntent.environmentalMotion,
      emotionalIntent:clip.motionIntent.emotionalIntent
    },
    protectedConstraints:[
      ...panel.continuityRequirements,
      ...input.storyboard.continuityChecks.protectedCanon,
      ...input.storyboard.continuityChecks.protectedMysteries
    ]
  };
}
