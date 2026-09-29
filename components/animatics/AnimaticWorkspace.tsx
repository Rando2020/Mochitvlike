"use client";
import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import type {AnimaticTimeline,MotionTreatment} from "@/lib/animatics/types";
import type {SeriesBlueprint} from "@/lib/series/types";
import styles from "./AnimaticWorkspace.module.css";

function motionClass(treatment:MotionTreatment){return{STATIC:styles.static,SLOW_PUSH:styles.slowPush,SLOW_PULL:styles.slowPull,PAN_LEFT:styles.panLeft,PAN_RIGHT:styles.panRight,PAN_UP:styles.panUp,PAN_DOWN:styles.panDown}[treatment];}
function formatTime(seconds:number){const m=Math.floor(seconds/60),s=Math.max(0,seconds-m*60);return `${m}:${s.toFixed(1).padStart(4,"0")}`;}

export function AnimaticWorkspace({timeline,series}:{timeline:AnimaticTimeline;series:SeriesBlueprint}){
 const [currentTime,setCurrentTime]=useState(0),[playing,setPlaying]=useState(false),[showDialogue,setShowDialogue]=useState(true);
 const lastTick=useRef<number|null>(null),total=timeline.pacingChecks.timelineDurationSeconds,cast=new Map(series.cast.map(c=>[c.id,c.name]));
 const activeIndex=useMemo(()=>{const i=timeline.clips.findIndex(c=>currentTime>=c.startSeconds&&currentTime<c.startSeconds+c.durationSeconds);return i>=0?i:Math.max(0,timeline.clips.length-1);},[currentTime,timeline.clips]);
 const active=timeline.clips[activeIndex],localTime=Math.max(0,currentTime-active.startSeconds);
 const activeDialogue=active.dialogueCues.filter(c=>localTime>=c.startOffsetSeconds&&localTime<c.startOffsetSeconds+c.estimatedDurationSeconds);

 useEffect(()=>{
  if(!playing){lastTick.current=null;return;}
  lastTick.current=performance.now();
  const timer=window.setInterval(()=>{
   const now=performance.now(),delta=(now-(lastTick.current??now))/1000;lastTick.current=now;
   setCurrentTime(current=>{const next=current+delta;if(next>=total){setPlaying(false);return total;}return next;});
  },50);
  return()=>window.clearInterval(timer);
 },[playing,total]);

 const seek=(value:number)=>{setCurrentTime(Math.min(total,Math.max(0,value)));lastTick.current=performance.now();};
 const scale=1+active.motionStrength*.18,shift=active.motionStrength*6;

 return <main className={styles.root}>
  <header className={styles.header}><div><span className={styles.eyebrow}>Animatic</span><h1>{timeline.identity.title}</h1><p>Rough editorial playback from your storyboard.</p></div><button className={styles.primary} disabled>Generate Motion</button></header>
  <section className={styles.player} aria-label="Animatic player">
   <div className={`${styles.frame} ${styles[active.transitionIn.toLowerCase()]}`}>
    <img key={active.id} src={active.asset.url} alt={`Animatic clip ${active.sequenceIndex+1}: ${active.storyPurpose}`} className={motionClass(active.motionTreatment)}
     style={{"--motion-scale":String(scale),"--motion-shift":`${shift}%`,"--motion-shift-neg":`${-shift}%`,"--clip-duration":`${active.durationSeconds}s`} as CSSProperties}/>
    {showDialogue&&activeDialogue.length?<div className={styles.dialogue}>{activeDialogue.map(c=><p key={c.scriptBlockId}><strong>{cast.get(c.characterId)??"Character"}</strong> {c.text}</p>)}</div>:null}
   </div>
   <div className={styles.controls}><button type="button" onClick={()=>setPlaying(v=>!v)}>{playing?"Pause":"Play"}</button><span>{formatTime(currentTime)} / {formatTime(total)}</span><label><input type="checkbox" checked={showDialogue} onChange={e=>setShowDialogue(e.target.checked)}/> Show dialogue</label></div>
   <input className={styles.scrubber} aria-label="Animatic timeline scrubber" type="range" min={0} max={total} step={0.01} value={currentTime} onChange={e=>seek(Number(e.target.value))}/>
  </section>
  <section className={styles.timeline} aria-label="Animatic clips">{timeline.clips.map((clip,index)=><button type="button" key={clip.id} className={`${styles.clip} ${index===activeIndex?styles.activeClip:""}`} onClick={()=>seek(clip.startSeconds)}><img src={clip.asset.url} alt=""/><div><strong>{String(index+1).padStart(2,"0")} · {clip.startSeconds.toFixed(1)}–{(clip.startSeconds+clip.durationSeconds).toFixed(1)}</strong><span>{clip.storyPurpose}</span><small>{clip.motionTreatment.replaceAll("_"," ").toLowerCase()}{clip.dialogueCues.length?" · dialogue":""}</small></div></button>)}</section>
  <section className={styles.pacing}><span className={styles.eyebrow}>Pacing</span><div className={styles.metrics}><div><small>Script target</small><strong>{timeline.pacingChecks.scriptDurationSeconds.toFixed(1)}s</strong></div><div><small>Animatic</small><strong>{timeline.pacingChecks.timelineDurationSeconds.toFixed(1)}s</strong></div><div><small>Difference</small><strong>{timeline.pacingChecks.differenceSeconds>=0?"+":""}{timeline.pacingChecks.differenceSeconds.toFixed(1)}s</strong></div></div>{timeline.pacingChecks.warnings.length?<ul>{timeline.pacingChecks.warnings.map(w=><li key={w}>{w}</li>)}</ul>:<p>Timing is aligned with the current Script estimate.</p>}</section>
 </main>;
}
