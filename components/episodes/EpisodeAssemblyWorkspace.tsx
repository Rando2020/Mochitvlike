"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import type {EpisodeTimeline,EpisodeTimelineClip} from "@/lib/episodes/assembly/types";
import styles from "./EpisodeAssemblyWorkspace.module.css";

function flat(timeline:EpisodeTimeline){return timeline.scenes.flatMap(scene=>scene.clips);}
function label(clip:EpisodeTimelineClip){return clip.mediaType==="MOTION_VIDEO"?"Animated clip":"Still hold";}
function fmt(seconds:number){const m=Math.floor(seconds/60),s=seconds-m*60;return m+":"+s.toFixed(1).padStart(4,"0");}

export function EpisodeAssemblyWorkspace({timeline,dialogueBase,latestDialogue}:{timeline:EpisodeTimeline;dialogueBase:string;latestDialogue?:{id:string}|null}){
  const router=useRouter();
  const clips=useMemo(()=>flat(timeline),[timeline]);
  const [currentTime,setCurrentTime]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [showDialogue,setShowDialogue]=useState(true);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voiceError,setVoiceError]=useState<string|null>(null);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const lastTick=useRef<number|null>(null);

  const activeIndex=useMemo(()=>{const i=clips.findIndex(c=>currentTime>=c.startSeconds&&currentTime<c.startSeconds+c.durationSeconds);return i>=0?i:Math.max(0,clips.length-1);},[clips,currentTime]);
  const active=clips[activeIndex];
  const allDialogue=useMemo(()=>timeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues)),[timeline]);
  const activeDialogue=allDialogue.filter(c=>currentTime>=c.startSeconds&&currentTime<c.startSeconds+c.durationSeconds);

  useEffect(()=>{
    if(!playing){lastTick.current=null;return;}
    lastTick.current=performance.now();
    const timer=window.setInterval(()=>{const now=performance.now(),delta=(now-(lastTick.current??now))/1000;lastTick.current=now;setCurrentTime(current=>{const next=current+delta;if(next>=timeline.targetDurationSeconds){setPlaying(false);return timeline.targetDurationSeconds;}return next;});},50);
    return()=>window.clearInterval(timer);
  },[playing,timeline.targetDurationSeconds]);

  useEffect(()=>{
    if(active.mediaType!=="MOTION_VIDEO"||!videoRef.current)return;
    const local=Math.max(0,Math.min(active.durationSeconds,currentTime-active.startSeconds)),desired=active.sourceOffsetSeconds+local;
    if(Math.abs(videoRef.current.currentTime-desired)>.2)videoRef.current.currentTime=desired;
    if(playing)void videoRef.current.play().catch(()=>{});else videoRef.current.pause();
  },[active.id,active.mediaType,active.durationSeconds,active.sourceOffsetSeconds,currentTime,playing]);

  const seek=(value:number)=>{setCurrentTime(Math.max(0,Math.min(timeline.targetDurationSeconds,value)));lastTick.current=performance.now();};
  const addVoices=async()=>{
    const publicBase=dialogueBase.replace("/api/series","/series");
    if(latestDialogue){router.push(publicBase+"/dialogue/"+latestDialogue.id);return;}
    setVoiceBusy(true);setVoiceError(null);
    try{
      const r=await fetch(dialogueBase+"/dialogue/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"INITIAL"})});
      const b=await r.json().catch(()=>null);
      if(!r.ok){setVoiceError(b?.error?.code??"DIALOGUE_AUDIO_FAILED");return;}
      router.push(publicBase+"/dialogue/"+b.dialogue.id);
    }finally{setVoiceBusy(false);}
  };

  return <main className={styles.root}>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Episode Assembly</span><h1>{timeline.identity.title}</h1><p>Silent visual cut · {fmt(timeline.targetDurationSeconds)}</p></div>
      <button className={styles.primary} disabled={voiceBusy||allDialogue.length===0} onClick={()=>void addVoices()}>{voiceBusy?"Preparing voices…":latestDialogue?"Open Voices":"Add Voices"}</button>
    </header>
    {voiceError?<p role="alert">{voiceError==="EPISODE_HAS_NO_DIALOGUE"?"This Episode has no spoken dialogue yet.":"Voices could not be prepared safely yet."}</p>:null}

    <section className={styles.player}>
      <div key={active.id} className={styles.viewport+" "+(active.transitionIn==="DISSOLVE"?styles.dissolve:"")}>
        {active.mediaType==="MOTION_VIDEO"?<video ref={videoRef} src={active.asset.url} muted playsInline preload="metadata"/>:<img src={active.asset.url} alt={"Still hold "+(active.sequenceIndex+1)+": "+active.storyPurpose}/>}
        <span className={styles.badge}>{label(active)}</span>
        {showDialogue&&activeDialogue.length?<div className={styles.dialogue}>{activeDialogue.map(c=><p key={c.scriptBlockId}>{c.text}</p>)}</div>:null}
      </div>
      <div className={styles.controls}><button type="button" onClick={()=>setPlaying(v=>!v)}>{playing?"Pause":"Play"}</button><span>{fmt(currentTime)} / {fmt(timeline.targetDurationSeconds)}</span><label><input type="checkbox" checked={showDialogue} onChange={e=>setShowDialogue(e.target.checked)}/> Show dialogue</label></div>
      <input aria-label="Episode timeline scrubber" className={styles.scrubber} type="range" min={0} max={timeline.targetDurationSeconds} step={.01} value={currentTime} onChange={e=>seek(Number(e.target.value))}/>
    </section>

    <section className={styles.timeline}>{timeline.scenes.map(scene=><div key={scene.sceneId} className={styles.sceneGroup}><div className={styles.sceneHeader}><span>Scene {scene.order+1}</span><small>{fmt(scene.durationSeconds)}</small></div><div className={styles.clipGrid}>{scene.clips.map(clip=><button key={clip.id} type="button" className={clip.id===active.id?styles.activeClip:styles.clip} onClick={()=>seek(clip.startSeconds)}>{clip.mediaType==="MOTION_VIDEO"?<video src={clip.asset.url} muted preload="metadata"/>:<img src={clip.asset.url} alt=""/>}<div><strong>{label(clip)}</strong><span>{clip.durationSeconds.toFixed(1)}s{clip.dialogueCues.length?" · dialogue":""}</span><small>{clip.storyPurpose}</small></div></button>)}</div></div>)}</section>

    <section className={styles.coverage}><span className={styles.eyebrow}>Coverage</span><div className={styles.metrics}><div><small>Episode target</small><strong>{timeline.targetDurationSeconds.toFixed(1)}s</strong></div><div><small>Assembly</small><strong>{timeline.scenes.reduce((s,x)=>s+x.durationSeconds,0).toFixed(1)}s</strong></div><div><small>Difference</small><strong>{timeline.validation.durationDifferenceSeconds.toFixed(1)}s</strong></div><div><small>Visual coverage</small><strong>{timeline.validation.hasVisualCoverage?"Complete":"Incomplete"}</strong></div><div><small>Script coverage</small><strong>{timeline.validation.hasScriptCoverage?"Complete":"Incomplete"}</strong></div></div>{timeline.validation.warnings.length?<ul>{timeline.validation.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>:<p>No assembly warnings.</p>}</section>
  </main>;
}
