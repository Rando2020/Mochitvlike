"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import type {SceneScript} from "@/lib/scripts/types";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {StoryboardBlueprint,StoryboardStatus} from "@/lib/storyboards/types";
import type {ProductionFrameRecord} from "@/lib/production-frames/types";
import styles from "./StoryboardWorkspace.module.css";

type FrameView=ProductionFrameRecord&{warnings?:string[];model?:{id:string;displayName:string;revision:string}};

export function StoryboardWorkspace({initialStoryboard,initialStatus,statusEndpoint,retryBase,script,series,latestAnimatic,initialProductionFrames=[]}:{
 initialStoryboard:StoryboardBlueprint;initialStatus:StoryboardStatus;statusEndpoint:string;retryBase:string;script:SceneScript;series:SeriesBlueprint;
 latestAnimatic?:{id:string}|null;initialProductionFrames?:ProductionFrameRecord[];
}){
 const router=useRouter();
 const [storyboard,setStoryboard]=useState(initialStoryboard);
 const [status,setStatus]=useState<StoryboardStatus>(initialStatus);
 const [retrying,setRetrying]=useState<string|null>(null);
 const [animaticBusy,setAnimaticBusy]=useState(false);
 const [animaticError,setAnimaticError]=useState<string|null>(null);
 const [frameBusy,setFrameBusy]=useState<string|null>(null);
 const [frameErrors,setFrameErrors]=useState<Record<string,string>>({});
 const [frames,setFrames]=useState<Record<string,FrameView>>(()=>Object.fromEntries(initialProductionFrames.map(frame=>[frame.storyboardPanelId,frame])));
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

 useEffect(()=>{
  const pending=Object.values(frames).filter(frame=>frame.generation&&(frame.generation.status==="PENDING"||frame.generation.status==="GENERATING"));
  if(!pending.length)return;
  let cancelled=false;
  const timer=window.setInterval(async()=>{
   const updates=await Promise.all(pending.map(async frame=>{
    const endpoint=`${retryBase}/panels/${frame.storyboardPanelId}/production-frame/${frame.id}`;
    const response=await fetch(endpoint,{cache:"no-store"});if(!response.ok)return null;
    const body=await response.json();return body.productionFrame as FrameView;
   }));
   if(cancelled)return;
   setFrames(current=>{const next={...current};for(const frame of updates)if(frame)next[frame.storyboardPanelId]=frame;return next;});
  },1500);
  return()=>{cancelled=true;window.clearInterval(timer);};
 },[frames,retryBase]);

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

 const generateFrame=async(panelId:string)=>{
  setFrameBusy(panelId);setFrameErrors(current=>({...current,[panelId]:""}));
  try{
   const response=await fetch(`${retryBase}/panels/${panelId}/production-frame/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"INITIAL"})});
   const body=await response.json().catch(()=>null);
   if(!response.ok){setFrameErrors(current=>({...current,[panelId]:body?.error?.code??"PRODUCTION_FRAME_GENERATION_FAILED"}));return;}
   const incoming=body.productionFrame;
   const frame:FrameView={
    id:incoming.id,creatorId:incoming.creatorId??"",storyboardPanelId:incoming.storyboardPanelId??panelId,version:incoming.version??1,status:incoming.status,
    selectedGenerationId:incoming.selectedGenerationId??null,developmentVisual:Boolean(incoming.developmentVisual),modelId:incoming.modelId??incoming.model?.id??"",
    modelRevision:incoming.modelRevision??incoming.model?.revision??"",generation:incoming.generation??null,warnings:body.warnings??incoming.warnings??[]
   };
   setFrames(current=>({...current,[panelId]:frame}));
  }finally{setFrameBusy(null);}
 };

 const retryFrame=async(panelId:string)=>{
  const frame=frames[panelId];if(!frame)return;setFrameBusy(panelId);
  try{
   const response=await fetch(`${retryBase}/panels/${panelId}/production-frame/${frame.id}/retry`,{method:"POST"});
   const body=await response.json().catch(()=>null);
   if(response.ok)setFrames(current=>({...current,[panelId]:{...frame,status:"GENERATING",generation:frame.generation?{...frame.generation,status:"PENDING",errorCode:null,retryCount:frame.generation.retryCount+1}:null}}));
   else setFrameErrors(current=>({...current,[panelId]:body?.error?.code??"PRODUCTION_FRAME_RETRY_FAILED"}));
  }finally{setFrameBusy(null);}
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
   {[...storyboard.panels].sort((a,b)=>a.sequenceIndex-b.sequenceIndex).map(panel=>{
    const frame=frames[panel.id],frameReady=frame?.generation?.status==="COMPLETED"&&frame.generation.outputUrl;
    const displayed=frameReady?frame.generation!.outputUrl:panel.asset?.url;
    const alt=frameReady?`Production frame ${panel.sequenceIndex+1}: ${panel.purpose}`:`Storyboard panel ${panel.sequenceIndex+1}: ${panel.purpose}`;
    return <article key={panel.id} className={styles.card}>
     <div className={styles.image}>
      {displayed?<img src={displayed} alt={alt}/>:<div className={styles.skeleton} aria-label="Planning image…"><span>{panel.generationStatus==="FAILED"?"Needs retry":"Planning image…"}</span></div>}
      <span className={styles.index}>{String(panel.sequenceIndex+1).padStart(2,"0")}</span>
     </div>
     <div className={styles.body}>
      <div className={styles.meta}><span>{panel.framingIntent.toLowerCase()}</span><span>{frameReady?"Production Frame Ready":panel.generationStatus==="COMPLETED"?"Storyboard Ready":panel.generationStatus==="FAILED"?"Needs retry":"Planning image…"}</span></div>
      {frame?.developmentVisual?<p><strong>Development Visual</strong></p>:null}
      <h2>{panel.purpose}</h2><p>{panel.moment}</p>
      <details><summary>Panel details</summary>
       <dl><div><dt>Characters</dt><dd>{panel.characterIds.map(id=>cast.get(id)??id).join(", ")||"Environment"}</dd></div><div><dt>Composition</dt><dd>{panel.composition}</dd></div><div><dt>Staging</dt><dd>{panel.staging}</dd></div><div><dt>Emotion</dt><dd>{panel.emotionalFocus}</dd></div></dl>
       <div className={styles.source}><strong>Source</strong>{sourceText(panel.sourceScriptBlockIds).map((line,i)=><p key={i}>{line}</p>)}</div>
       {frameReady&&panel.asset?<div className={styles.source}><strong>Storyboard source preserved</strong><img src={panel.asset.url} alt={`Original storyboard source for panel ${panel.sequenceIndex+1}`}/></div>:null}
      </details>
      {panel.generationStatus==="FAILED"?<button type="button" onClick={()=>void retry(panel.id)} disabled={retrying===panel.id}>{retrying===panel.id?"Retrying…":"Retry panel"}</button>:null}
      {!frame?<button type="button" onClick={()=>void generateFrame(panel.id)} disabled={frameBusy===panel.id||panel.generationStatus!=="COMPLETED"}>{frameBusy===panel.id?"Starting…":"Generate Production Frame"}</button>:null}
      {frame&&(frame.generation?.status==="PENDING"||frame.generation?.status==="GENERATING")?<button type="button" disabled>Generating…</button>:null}
      {frameReady?<button type="button" disabled>Production Frame Ready</button>:null}
      {frame?.generation?.status==="FAILED"?<button type="button" onClick={()=>void retryFrame(panel.id)} disabled={frameBusy===panel.id}>{frameBusy===panel.id?"Retrying…":"Retry Production Frame"}</button>:null}
      {frameErrors[panel.id]?<div role="alert">{frameErrors[panel.id]==="MISSING_PRODUCTION_REFERENCE"?<><p>{panel.characterIds.map(id=>cast.get(id)??id).join(" and ")||"This shot"} needs approved production references before this frame can be rendered.</p><a href={`/series/${storyboard.seriesId}/references`}>Open Reference Studio</a></>:<p>{frameErrors[panel.id]}</p>}</div>:null}
     </div>
    </article>;
   })}
  </section>
 </main>;
}
