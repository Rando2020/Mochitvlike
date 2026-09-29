import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {PanelGenerationSpec,StoryboardPanel} from "./types";
export function buildPanelGenerationSpec(input:{storyboardId:string;seriesId:string;sceneId:string;series:SeriesBlueprint;scene:SceneBlueprint;visualPlan:VisualPlan;panel:StoryboardPanel;}):PanelGenerationSpec{
 const cast=new Map(input.series.cast.map(c=>[c.id,c]));
 const location=input.panel.locationId?input.series.world.locations.find(l=>l.id===input.panel.locationId)??null:null;
 return{
  panelId:input.panel.id,seriesId:input.seriesId,sceneId:input.sceneId,storyboardId:input.storyboardId,
  creativeDirection:{
   visualStyleDescription:input.series.creativeDNA.visualStyle.description,
   visualTags:[...input.series.creativeDNA.visualStyle.tags],
   colorLanguage:input.series.creativeDNA.visualStyle.colorLanguage,
   lighting:input.series.creativeDNA.visualStyle.lighting,
   animationLanguage:input.series.creativeDNA.visualStyle.animationLanguage
  },
  panel:{framingIntent:input.panel.framingIntent,composition:input.panel.composition,staging:input.panel.staging,emotionalFocus:input.panel.emotionalFocus},
  characters:input.panel.characterIds.map(id=>{const c=cast.get(id);if(!c)throw new Error("STORYBOARD_CAST_REFERENCE_INVALID");return{
   characterId:id,name:c.name,visualConcept:c.visualConcept,visualDescription:c.characterSheetSeed.visualDescription,
   continuityRequirements:input.panel.appearanceRequirements.find(a=>a.characterId===id)?.requirements??[]
  };}),
  environment:{locationId:location?.id??null,locationName:location?.name??null,description:location?.description??null,visualTags:location?.visualTags??[],requirements:[...input.panel.environmentRequirements]},
  protectedConstraints:[...input.panel.continuityRequirements,...input.visualPlan.continuity.protectedCanon,...input.visualPlan.continuityChecks.protectedMysteries]
 };
}
