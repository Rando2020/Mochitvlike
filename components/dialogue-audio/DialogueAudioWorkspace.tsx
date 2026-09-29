"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan,DialoguePlanStatus,VoiceCast} from "@/lib/dialogue-audio/types";
import styles from "./DialogueAudioWorkspace.module.css";

type StatusLine=DialogueAudioPlan["lines"][number]&{retryCount:number;error:{code:string}|null};
const fmt=(s:number)=>{const m=Math.floor(s/60),r=s-m*60;return m+":"+r.toFixed(1).padStart(4,"0");};
const stateLabel=(line:StatusLine)=>line.generationStatus==="COMPLETED"?(line.timing.fit==="TOO_LONG"?"Runs long":"Ready"):line.generationStatus==="FAILED"?"Needs retry":line.generationStatus==="GENERATING"?"Voicing…":"Waiting";

export function DialogueAudioWorkspace({timeline,initialPlan,initialStatus,voiceCast,statusEndpoint,retryBase}:{
  timeline:EpisodeTimeline;initialPlan:DialogueAudioPlan;initialStatus:DialoguePlanStatus;voiceCast:VoiceCast;statusEndpoint:string;retryBase:string;
}){
  const [plan,setPlan]=useState(initialPlan as DialogueAudioPlan&{lines:StatusLine[]});
  const [status,setStatus]=useState(initialStatus);
  const [currentTime,setCurrentTime]=useState(0),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[showDialogue,setShowDialogue]=useState(true),[retrying,setRetrying]=useState<string|null>(null);
  const videoRef=useRef<HTMLVideoElement|null>(null),audioRef=useRef<HTMLAudioElement|null>(null),lastTick=useRef<number|null>(null);
  const clips=useMemo(()=>timeline.scenes.flatMap(s=>s.clips),[timeline]);
  const activeClip=clips.find(c=>currentTime>=c.startSeconds&&currentTime<c.startSeconds+c.durationSeconds)??clips.at(-1)!;
  const activeLine=(plan.lines as StatusLine[]).find(l=>currentTime>=l.episodeStartSeconds&&currentTime<l.episodeStartSeconds+l.visualWindowSeconds)??null;
  const castByCharacter=new Map(voiceCast.assignments.map(a=>[a.characterId,a]));

  useEffect(()=>{
    if(status!=="GENERATING")return;
    let cancelled=false,timer:number|undefined;
    const poll=async()=>{
      if(document.visibilityState==="hidden"){timer=window.setTimeout(poll,5000);return;}
      const r=await fetch(statusEndpoint,{cache:"no-store"});
      if(r.ok&&!cancelled){const b=await r.json(),d=b.dialogue;setStatus(d.status);setPlan(d.plan);if(d.status==="GENERATING")timer=window.setTimeout(poll,d.pollAfterMs??1500);}
      else if(!cancelled)timer=window.setTimeout(poll,3000);
    };
    timer=window.setTimeout(poll,1500);return()=>{cancelled=true;if(timer)clearTimeout(timer);};
  },[status,statusEndpoint]);

  useEffect(()=>{
    if(!playing){lastTick.current=null;return;}
    lastTick.current=performance.now();
    const t=window.setInterval(()=>{const now=performance.now(),delta=(now-(lastTick.current??now))/1000;lastTick.current=now;setCurrentTime(v=>{const n=v+delta;if(n>=timeline.targetDurationSeconds){setPlaying(false);return timeline.targetDurationSeconds;}return n;});},50);
    return()=>window.clearInterval(t);
  },[playing,timeline.targetDurationSeconds]);

  useEffect(()=>{
    if(activeClip.mediaType!=="MOTION_VIDEO"||!videoRef.current)return;
    const desired=activeClip.sourceOffsetSeconds+Math.max(0,currentTime-activeClip.startSeconds);
    if(Math.abs(videoRef.current.currentTime-desired)>.2)videoRef.current.currentTime=desired;
    if(playing)void videoRef.current.play().catch(()=>{});else videoRef.current.pause();
  },[activeClip.id,activeClip.mediaType,currentTime,playing]);

  useEffect(()=>{
    if(!activeLine||activeLine.generationStatus!=="COMPLETED"||!activeLine.audioAsset||!audioRef.current||muted){audioRef.current?.pause();return;}
    const desired=Math.max(0,currentTime-activeLine.episodeStartSeconds);
    if(Math.abs(audioRef.current.currentTime-desired)>.15)audioRef.current.currentTime=desired;
    if(playing)void audioRef.current.play().catch(()=>{});else audioRef.current.pause();
  },[activeLine?.id,currentTime,playing,muted]);

  const retry=async(lineId:string)=>{setRetrying(lineId);try{const r=await fetch(retryBase+"/lines/"+lineId+"/retry",{method:"POST"});if(r.ok){setPlan(p=>({...p,lines:p.lines.map(l=>l.id===lineId?{...l,generationStatus:"PENDING",audioAsset:null,timing:{naturalDurationSeconds:null,differenceSeconds:null,fit:"UNKNOWN"},error:null}:l)}));setStatus("GENERATING");}}finally{setRetrying(null);}};
  const playSample=(characterId:string)=>{const line=(plan.lines as StatusLine[]).find(l=>l.characterId===characterId&&l.audioAsset);if(line?.audioAsset)void new Audio(line.audioAsset.url).play();};

  return <main className={styles.root}>
    <header className={styles.hero}><div><span className={styles.eyebrow}>Dialogue Audio</span><h1>{timeline.identity.title}</h1><p>AI-generated character voices · visual timing stays fixed</p></div><button className={styles.primary} disabled>Add Sound</button></header>
    <p className={styles.disclosure}>Voices in this preview are AI-generated.</p>

    <section className={styles.player}>
      <div className={styles.viewport}>
        {activeClip.mediaType==="MOTION_VIDEO"?<video ref={videoRef} key={activeClip.id} src={activeClip.asset.url} muted playsInline preload="metadata"/>:<img src={activeClip.asset.url} alt={"Still hold "+(activeClip.sequenceIndex+1)}/>}
        {activeLine?.generationStatus==="COMPLETED"&&activeLine.audioAsset?<audio ref={audioRef} key={activeLine.id} src={activeLine.audioAsset.url} preload="metadata"/>:null}
        {showDialogue&&activeLine?<div className={styles.dialogue}>{activeLine.text}</div>:null}
      </div>
      <div className={styles.controls}><button onClick={()=>setPlaying(v=>!v)}>{playing?"Pause":"Play Episode"}</button><span>{fmt(currentTime)} / {fmt(timeline.targetDurationSeconds)}</span><button onClick={()=>setMuted(v=>!v)}>{muted?"Unmute dialogue":"Mute dialogue"}</button><label><input type="checkbox" checked={showDialogue} onChange={e=>setShowDialogue(e.target.checked)}/> Show dialogue</label></div>
      <input aria-label="Dialogue episode scrubber" type="range" min={0} max={timeline.targetDurationSeconds} step={.01} value={currentTime} onChange={e=>setCurrentTime(Number(e.target.value))}/>
    </section>

    <section className={styles.cast}><span className={styles.eyebrow}>Voice Cast</span><div className={styles.castStrip}>{voiceCast.assignments.map(a=><article key={a.id}><strong>{a.characterName}</strong><span>{a.voiceProfile.displayName}</span><small>{a.voiceProfile.speakingStyle} · {a.voiceProfile.energy}</small><div><button onClick={()=>playSample(a.characterId)} disabled={!(plan.lines as StatusLine[]).some(l=>l.characterId===a.characterId&&l.audioAsset)}>Play sample</button><button disabled>Keep voice</button><button disabled title="Voice changes require explicit bounded regeneration.">Change voice</button></div></article>)}</div></section>

    <section className={styles.lines}><span className={styles.eyebrow}>Dialogue Timeline</span>{(plan.lines as StatusLine[]).map(line=><article key={line.id} className={styles.line}>
      <div><strong>{castByCharacter.get(line.characterId)?.characterName??"Character"}</strong><span>{fmt(line.episodeStartSeconds)} · {line.visualWindowSeconds.toFixed(1)}s window</span></div>
      <p>{line.text}</p>
      <div className={styles.meta}><span>{stateLabel(line)}</span>{line.timing.naturalDurationSeconds!=null?<span>{line.timing.naturalDurationSeconds.toFixed(1)}s audio</span>:null}{line.timing.fit==="TOO_LONG"&&line.timing.differenceSeconds!=null?<strong>Runs {line.timing.differenceSeconds.toFixed(1)}s long</strong>:null}</div>
      {line.generationStatus==="FAILED"?<button onClick={()=>void retry(line.id)} disabled={retrying===line.id}>{retrying===line.id?"Retrying…":"Retry failed line"}</button>:null}
    </article>)}</section>
  </main>;
}
