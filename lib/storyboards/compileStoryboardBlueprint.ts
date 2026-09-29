import { randomUUID } from "node:crypto";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { VisualPlan } from "@/lib/visual-planning/types";
import type { FramingIntent,PanelGenerationSpec,StoryboardBlueprint,StoryboardPanel } from "./types";

type VisualBeat=VisualPlan["visualBeats"][number];

function framing(index:number,total:number,beat:VisualBeat):FramingIntent{
  if(index===0 && total>3)return "ESTABLISHING";
  if(beat.focalCharacterIds.length===0)return "WIDE";
  if(beat.focalCharacterIds.length===1 && /reaction|notice|realize|hesitat/i.test(beat.purpose+" "+beat.emotionalFunction))return "REACTION";
  if(/hand|object|detail|wound|prop/i.test(beat.compositionIntent))return "DETAIL";
  return beat.focalCharacterIds.length===1?"CLOSE":"MEDIUM";
}
function groupBeats(beats:VisualBeat[]):VisualBeat[][]{
  if(beats.length<=8)return beats.map(beat=>[beat]);
  const groups:Array<VisualBeat[]> = Array.from({length:8},()=>[]);
  beats.forEach((beat,index)=>groups[Math.min(7,Math.floor(index*8/beats.length))].push(beat));
  return groups.filter(group=>group.length>0);
}
export function compileStoryboardBlueprint(input:{storyboardId:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;version:number;series:SeriesBlueprint;scene:SceneBlueprint;script:SceneScript;visualPlan:VisualPlan;}):{blueprint:StoryboardBlueprint;specs:PanelGenerationSpec[]}{
  const groups=groupBeats(input.visualPlan.visualBeats);
  const castById=new Map(input.series.cast.map(c=>[c.id,c]));
  const location=input.scene.location.locationId?input.series.world.locations.find(l=>l.id===input.scene.location.locationId)??null:null;
  const panels:StoryboardPanel[]=[];const specs:PanelGenerationSpec[]=[];

  groups.forEach((group,index)=>{
    const beat=group[0],panelId=randomUUID();
    const characterIds=[...new Set(group.flatMap(item=>[...item.focalCharacterIds,...item.supportingCharacterIds]))];
    const sourceScriptBlockIds=[...new Set(group.flatMap(item=>item.sourceScriptBlockIds))];
    const continuityRequirements=[...input.visualPlan.continuityChecks.characterConsistency,...input.visualPlan.continuityChecks.forbiddenVisualContradictions];
    const appearanceRequirements=characterIds.map(characterId=>({characterId,requirements:[
      ...(input.visualPlan.continuity.characters.find(c=>c.characterId===characterId)?.requiredAppearanceNotes??[]),
      ...(input.visualPlan.continuity.characters.find(c=>c.characterId===characterId)?.continuityNotes??[])
    ]}));
    const panel:StoryboardPanel={
      id:panelId,sourceVisualBeatId:beat.id,sourceScriptBlockIds,sequenceIndex:index,
      purpose:group.length===1?beat.purpose:group.map(item=>item.purpose).join(" → "),
      moment:group.length===1?beat.storyMoment:group.map(item=>item.storyMoment).join(" Then "),
      characterIds,locationId:input.visualPlan.continuity.locationId,framingIntent:framing(index,groups.length,beat),
      composition:group.length===1?beat.compositionIntent:group.map(item=>item.compositionIntent).join(" Then "),
      staging:group.length===1?beat.staging:group.map(item=>item.staging).join(" Then "),
      emotionalFocus:group.length===1?beat.emotionalFunction:group.map(item=>item.emotionalFunction).join(" → "),
      continuityRequirements,appearanceRequirements,
      environmentRequirements:[...input.visualPlan.continuity.environmentRules,...input.visualPlan.continuityChecks.environmentConsistency],
      generationStatus:"PENDING",asset:null
    };
    panels.push(panel);
    specs.push({
      panelId,seriesId:input.seriesId,sceneId:input.sceneId,storyboardId:input.storyboardId,
      creativeDirection:{visualStyleDescription:input.series.creativeDNA.visualStyle.description,visualTags:[...input.series.creativeDNA.visualStyle.tags],colorLanguage:input.series.creativeDNA.visualStyle.colorLanguage,lighting:input.series.creativeDNA.visualStyle.lighting,animationLanguage:input.series.creativeDNA.visualStyle.animationLanguage},
      panel:{framingIntent:panel.framingIntent,composition:panel.composition,staging:panel.staging,emotionalFocus:panel.emotionalFocus},
      characters:characterIds.map(id=>{const c=castById.get(id);if(!c)throw new Error("STORYBOARD_CAST_REFERENCE_INVALID");return{characterId:id,name:c.name,visualConcept:c.visualConcept,visualDescription:c.characterSheetSeed.visualDescription,continuityRequirements:appearanceRequirements.find(a=>a.characterId===id)?.requirements??[]};}),
      environment:{locationId:location?.id??null,locationName:location?.name??null,description:location?.description??null,visualTags:location?.visualTags??[],requirements:panel.environmentRequirements},
      protectedConstraints:[...continuityRequirements,...input.visualPlan.continuity.protectedCanon,...input.visualPlan.continuityChecks.protectedMysteries]
    });
  });

  return{blueprint:{
    id:input.storyboardId,seriesId:input.seriesId,sceneId:input.sceneId,scriptId:input.scriptId,visualPlanId:input.visualPlanId,version:input.version,
    identity:{title:input.visualPlan.identity.title.replace(/Visual Plan/i,"Storyboard")},panels,
    continuityChecks:{protectedCanon:[...input.visualPlan.continuity.protectedCanon],protectedMysteries:[...input.visualPlan.continuityChecks.protectedMysteries],characterConsistency:[...input.visualPlan.continuityChecks.characterConsistency],environmentConsistency:[...input.visualPlan.continuityChecks.environmentConsistency]},
    confidence:{overall:input.visualPlan.confidence.overall,assumptions:[...input.visualPlan.confidence.assumptions]}
  },specs};
}
