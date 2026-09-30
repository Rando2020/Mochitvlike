import {buildValidDialogue} from "@/lib/dialogue-audio/__tests__/fixtures";
import {compileSoundDesignPlan} from "../compileSoundDesignPlan";

export function buildValidSound(){
 const f=buildValidDialogue();
 const series=structuredClone(f.series),scene=structuredClone(f.scene),script=structuredClone(f.script),visualPlan=structuredClone(f.visualPlan);
 series.creativeDNA.sound.musicDirection="cinematic orchestral ambient strings with a dark emotional pulse";
 scene.location.settingNotes="A rain-soaked forest shelter with wind outside.";
 const action=script.blocks.find(b=>b.id==="block_1");if(action?.type==="ACTION")action.text="Orin closes the wooden door, then tightens the bandage.";
 const plan=compileSoundDesignPlan({planId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",series,episode:f.episodeTimeline,dialogue:f.plan,scenes:[{order:0,scene,script,visualPlan}],version:1});
 return{...f,series,scene,script,visualPlan,soundPlan:plan};
}
