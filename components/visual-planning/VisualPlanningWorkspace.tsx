"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import type {SceneScript} from "@/lib/scripts/types";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {VisualPlan,VisualPlanSummary} from "@/lib/visual-planning/types";
import styles from "./VisualPlanningWorkspace.module.css";

export function VisualPlanningWorkspace({plan,versions,script,series,latestStoryboard}:{
 plan:VisualPlan;versions:VisualPlanSummary[];script:SceneScript;series:SeriesBlueprint;
 latestStoryboard?:{id:string;status:string;panelCount:number;completedPanels:number}|null;
}){
 const router=useRouter();const [generating,setGenerating]=useState(false);const [error,setError]=useState(false);
 const castById=new Map(series.cast.map(m=>[m.id,m.name]));const blockById=new Map(script.blocks.map(b=>[b.id,b]));
 const describe=(id:string)=>{const b=blockById.get(id);if(!b)return"Source moment";if(b.type==="DIALOGUE")return(castById.get(b.characterId)??"Character")+': "'+b.text+'"';if(b.type==="REACTION")return(castById.get(b.characterId)??"Character")+": "+b.text;return b.type==="ACTION"?b.text:"Beat: "+b.purpose;};
 const generate=async()=>{
  if(latestStoryboard){router.push(`/series/${plan.seriesId}/scenes/${plan.sceneId}/scripts/${plan.scriptId}/visual-plans/${plan.id}/storyboards/${latestStoryboard.id}`);return;}
  setGenerating(true);setError(false);
  try{
   const res=await fetch(`/api/series/${plan.seriesId}/scenes/${plan.sceneId}/scripts/${plan.scriptId}/visual-plans/${plan.id}/storyboards/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"INITIAL"})});
   if(!res.ok){setError(true);return;}
   const body=await res.json();router.push(`/series/${plan.seriesId}/scenes/${plan.sceneId}/scripts/${plan.scriptId}/visual-plans/${plan.id}/storyboards/${body.storyboard.id}`);
  }finally{setGenerating(false);}
 };
 return <main className={styles.root}>
  <header className={styles.hero}><div><span className={styles.eyebrow}>Visual plan</span><h1>{plan.identity.title}</h1><p>{plan.visualIntent.visualThesis}</p>{error?<p role="alert">The storyboard could not be started safely yet.</p>:null}</div>
   <button type="button" className={styles.primaryButton} disabled={generating} onClick={()=>void generate()}>{generating?"Starting…":latestStoryboard?"Continue Storyboard":"Generate Storyboard"}</button>
  </header>
  <section className={styles.summaryGrid}><article><span className={styles.eyebrow}>Creative DNA</span><strong>{series.creativeDNA.visualStyle.description}</strong><p>{series.creativeDNA.visualStyle.colorLanguage}</p><p>{series.creativeDNA.visualStyle.lighting}</p></article><article><span className={styles.eyebrow}>Scene staging</span><strong>{plan.staging.geography}</strong><p>{plan.visualIntent.pacingIntent}</p></article></section>
  <div className={styles.versionRow}><span>Visual plan version</span><strong>{versions.find(v=>v.version===plan.version)?.status==="APPROVED"?"Approved":"Draft"} v{plan.version}</strong></div>
  <section className={styles.positions}><span className={styles.eyebrow}>Character positions</span><div className={styles.positionGrid}>{plan.staging.characterPositions.map(p=><article key={p.characterId}><strong>{castById.get(p.characterId)??p.characterId}</strong><p>{p.initialPosition}</p><small>{p.movementIntent}</small></article>)}</div></section>
  <section className={styles.timeline}><div className={styles.sectionHeader}><span className={styles.eyebrow}>Visual beats</span><strong>{plan.visualBeats.length} storytelling units</strong></div>{plan.visualBeats.map((beat,index)=><article className={styles.beatCard} key={beat.id}><div className={styles.beatIndex}>{String(index+1).padStart(2,"0")}</div><div className={styles.beatBody}><h2>{beat.purpose}</h2><p className={styles.storyMoment}>{beat.storyMoment}</p><dl><div><dt>Focus</dt><dd>{beat.focalCharacterIds.map(id=>castById.get(id)??id).join(" → ")||"Environment"}</dd></div><div><dt>Composition</dt><dd>{beat.compositionIntent}</dd></div><div><dt>Staging</dt><dd>{beat.staging}</dd></div><div><dt>Emotion</dt><dd>{beat.emotionalFunction}</dd></div><div><dt>Motion</dt><dd>{beat.motionIntent}</dd></div><div><dt>Transition</dt><dd>{beat.transitionIntent}</dd></div><div><dt>Duration</dt><dd>{beat.estimatedDurationSeconds.toFixed(1)} sec</dd></div></dl><div className={styles.sourceBox}><span>Source</span>{beat.sourceScriptBlockIds.map(id=><p key={id}>{describe(id)}</p>)}</div></div></article>)}</section>
  <section className={styles.continuity}><span className={styles.eyebrow}>Continuity notes</span><div className={styles.continuityGrid}><article><strong>Characters</strong>{plan.continuityChecks.characterConsistency.map(x=><p key={x}>{x}</p>)}</article><article><strong>Environment</strong>{plan.continuityChecks.environmentConsistency.map(x=><p key={x}>{x}</p>)}</article></div></section>
 </main>;
}
