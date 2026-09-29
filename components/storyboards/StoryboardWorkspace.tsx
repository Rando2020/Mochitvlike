"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import type {SceneScript} from "@/lib/scripts/types";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {StoryboardBlueprint,StoryboardStatus} from "@/lib/storyboards/types";
import styles from "./StoryboardWorkspace.module.css";

export function StoryboardWorkspace({initialStoryboard,initialStatus,statusEndpoint,retryBase,script,series,latestAnimatic}:{
 initialStoryboard:StoryboardBlueprint;initialStatus:StoryboardStatus;statusEndpoint:string;retryBase:string;script:SceneScript;series:SeriesBlueprint;
 latestAnimatic?:{id:string}|null;
}){
 const router=useRouter();
 const [storyboard,setStoryboard]=useState(initialStoryboard);
 const [status,setStatus]=useState<StoryboardStatus>(initialStatus);
 const [retrying,setRetrying]=useState<string|null>(null);
 const [animaticBusy,setAnimaticBusy]=useState(false);
 const [animaticError,setAnimaticError]=useState<string|null>(null);
 const cast=new Map(series.cast.map(c=>[c.id,c.name]));
 const blocks=new Map(script.blocks.map(b=>[b.id,b]));
 const terminal=status==="READY"||status==="PARTIAL"||status==="FAILED"||status==="ARCHIVED";

 useEffect(()=>{
  if(terminal)return;
  let cancelled=false;let timer:number|undefined;
  const poll=async()=>{
   if(document.visibilityState==="hidden"){timer=window.setTimeout(poll,3000);return;}
   const response=await fetch(statusEndpoint,{cache:"no-store"});
   if(response.ok&&!cancelled){
    const body=await response.json();const remote=body.storyboard;setStatus(remote.status);
    setStoryboard(current=>({...current,panels:current.panels.map(panel=>{
     const next=remote.panels.find((p:{id:string})=>p.id===panel.id);
     return next?{...panel,generationStatus:next.generationStatus,asset:next.asset}:panel;
    })}));
    if(!["READY","PARTIAL","FAILED","ARCHIVED"].includes(remote.status))timer=window.setTimeout(poll,remote.pollAfterMs??1500);
   }else if(!cancelled)timer=window.setTimeout(poll,3000);
  };
  timer=window.setTimeout(poll,1500);
  const visible=()=>{if(document.visibilityState==="visible"){if(timer)clearTimeout(timer);void poll();}};
  document.addEventListener("visibilitychange",visible);
  return()=>{cancelled=true;if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",visible);};
 },[statusEndpoint,terminal]);

 const completed=storyboard.panels.filter(p=>p.generationStatus==="COMPLETED").length;
 const progress=Math.round((completed/Math.max(1,storyboard.panels.length))*100);
 const sourceText=(ids:string[])=>ids.map(id=>{const b=blocks.get(id);if(!b)return null;if(b.type==="DIALOGUE")return `${cast.get(b.characterId)??"Character"}: “${b.text}”`;if(b.type==="REACTION")return `${cast.get(b.characterId)??"Character"}: ${b.text}`;return b.type==="ACTION"?b.text:b.purpose;}).filter((x):x is string=>Boolean(x));
 const label=status==="READY"?"Ready":status==="PARTIAL"?"Some panels need retry":status==="FAILED"?"Needs retry":"Building storyboard…";

 const retry=async(panelId:string)=>{
  setRetrying(panelId);
  try{
   const response=await fetch(`${retryBase}/panels/${panelId}/retry`,{method:"POST"});
   if(response.ok){setStoryboard(current=>({...current,panels:current.panels.map(p=>p.id===panelId?{...p,generationStatus:"PENDING",asset:null}:p)}));setStatus("GENERATING");}
  }finally{setRetrying(null);}
 };

 const continueToAnimatic=async()=>{
  const publicBase=retryBase.replace("/api/series","/series");
  if(latestAnimatic){router.push(`${publicBase}/animatics/${latestAnimatic.id}`);return;}
  setAnimaticBusy(true);setAnimaticError(null);
  try{
   const response=await fetch(`${retryBase}/animatics/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"INITIAL"})});
   if(!response.ok){const body=await response.json().catch(()=>null);setAnimaticError(body?.error?.code??"ANIMATIC_GENERATION_FAILED");return;}
   const body=await response.json();router.push(`${publicBase}/animatics/${body.animatic.id}`);
  }finally{setAnimaticBusy(false);}
 };

 return <main className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.eyebrow}>Storyboard</span><h1>{storyboard.identity.title}</h1><p>{label} · {completed}/{storyboard.panels.length} panels</p></div>
   <button className={styles.primary} disabled={animaticBusy||!(status==="READY"||status==="PARTIAL")} onClick={()=>void continueToAnimatic()}>{animaticBusy?"Building animatic…":latestAnimatic?"Open Animatic":"Continue to Animatic"}</button>
  </header>
  {animaticError?<p role="alert">{animaticError==="ANIMATIC_STORYBOARD_INCOMPLETE"?"Finish the missing storyboard moments before building the animatic.":"The animatic could not be assembled safely yet."}</p>:null}
  <div className={styles.progress}><div style={{width:`${progress}%`}}/><span>{progress}% ready</span></div>
  <section className={styles.grid}>
   {[...storyboard.panels].sort((a,b)=>a.sequenceIndex-b.sequenceIndex).map(panel=><article key={panel.id} className={styles.card}>
    <div className={styles.image}>
     {panel.asset?<img src={panel.asset.url} alt={`Storyboard panel ${panel.sequenceIndex+1}: ${panel.purpose}`}/>:<div className={styles.skeleton} aria-label="Planning image…"><span>{panel.generationStatus==="FAILED"?"Needs retry":"Planning image…"}</span></div>}
     <span className={styles.index}>{String(panel.sequenceIndex+1).padStart(2,"0")}</span>
    </div>
    <div className={styles.body}>
     <div className={styles.meta}><span>{panel.framingIntent.toLowerCase()}</span><span>{panel.generationStatus==="COMPLETED"?"Ready":panel.generationStatus==="FAILED"?"Needs retry":"Planning image…"}</span></div>
     <h2>{panel.purpose}</h2><p>{panel.moment}</p>
     <details><summary>Panel details</summary>
      <dl><div><dt>Characters</dt><dd>{panel.characterIds.map(id=>cast.get(id)??id).join(", ")||"Environment"}</dd></div><div><dt>Composition</dt><dd>{panel.composition}</dd></div><div><dt>Staging</dt><dd>{panel.staging}</dd></div><div><dt>Emotion</dt><dd>{panel.emotionalFocus}</dd></div></dl>
      <div className={styles.source}><strong>Source</strong>{sourceText(panel.sourceScriptBlockIds).map((line,i)=><p key={i}>{line}</p>)}</div>
     </details>
     {panel.generationStatus==="FAILED"?<button type="button" onClick={()=>void retry(panel.id)} disabled={retrying===panel.id}>{retrying===panel.id?"Retrying…":"Retry panel"}</button>:null}
    </div>
   </article>)}
  </section>
 </main>;
}
