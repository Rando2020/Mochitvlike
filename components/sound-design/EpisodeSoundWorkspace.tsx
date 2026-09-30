"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan} from "@/lib/dialogue-audio/types";
import type {SoundDesignPlan,SoundPlanStatus,SoundCueState,EpisodeMixTimeline,SoundCue} from "@/lib/sound-design/types";
import styles from "./EpisodeSoundWorkspace.module.css";

const fmt=(s:number)=>{const m=Math.floor(s/60),r=s-m*60;return m+":"+r.toFixed(1).padStart(4,"0");};
const cueName=(c:SoundCue)=>c.type==="MUSIC"?c.purpose:c.type==="AMBIENCE"?c.environment:c.type==="SFX"?c.event:c.type==="FOLEY"?c.action:c.reason;
const human=(status:string)=>status==="GENERATING"?"Generating…":status==="FAILED"?"Needs retry":status==="LIBRARY"?"Library":status==="COMPLETED"?"Ready":status==="PENDING"?"Waiting":status;

export function EpisodeSoundWorkspace({timeline,dialogue,initialPlan,initialStates,initialMix,initialStatus,statusEndpoint,retryBase}:{
 timeline:EpisodeTimeline;dialogue:DialogueAudioPlan;initialPlan:SoundDesignPlan;initialStates:SoundCueState[];initialMix:EpisodeMixTimeline;initialStatus:SoundPlanStatus;statusEndpoint:string;retryBase:string;
}){
 const [plan,setPlan]=useState(initialPlan),[states,setStates]=useState(initialStates),[mix,setMix]=useState(initialMix),[status,setStatus]=useState(initialStatus);
 const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[muteDialogue,setMuteDialogue]=useState(false),[muteMusic,setMuteMusic]=useState(false),[muteAmbience,setMuteAmbience]=useState(false),[muteEffects,setMuteEffects]=useState(false),[retrying,setRetrying]=useState<string|null>(null);
 const videoRef=useRef<HTMLVideoElement|null>(null),lastTick=useRef<number|null>(null),audioRefs=useRef(new Map<string,HTMLAudioElement>());
 const clips=useMemo(()=>timeline.scenes.flatMap(s=>s.clips),[timeline]);const activeClip=clips.find(c=>time>=c.startSeconds&&time<c.startSeconds+c.durationSeconds)??clips.at(-1)!;
 const stateByCue=new Map(states.map(s=>[s.cueId,s]));

 useEffect(()=>{if(status!=="GENERATING")return;let stop=false,timer:number|undefined;const poll=async()=>{if(document.visibilityState==="hidden"){timer=window.setTimeout(poll,5000);return;}const r=await fetch(statusEndpoint,{cache:"no-store"});if(r.ok&&!stop){const b=await r.json(),s=b.sound;setStatus(s.status);setPlan(s.plan);setStates(s.states);setMix(s.mix);if(s.status==="GENERATING")timer=window.setTimeout(poll,s.pollAfterMs??1800);}else if(!stop)timer=window.setTimeout(poll,3000);};timer=window.setTimeout(poll,1800);return()=>{stop=true;if(timer)clearTimeout(timer);};},[status,statusEndpoint]);
 useEffect(()=>{if(!playing){lastTick.current=null;return;}lastTick.current=performance.now();const timer=window.setInterval(()=>{const now=performance.now(),d=(now-(lastTick.current??now))/1000;lastTick.current=now;setTime(v=>{const n=v+d;if(n>=timeline.targetDurationSeconds){setPlaying(false);return timeline.targetDurationSeconds;}return n;});},50);return()=>clearInterval(timer);},[playing,timeline.targetDurationSeconds]);
 useEffect(()=>{if(activeClip.mediaType!=="MOTION_VIDEO"||!videoRef.current)return;const desired=activeClip.sourceOffsetSeconds+Math.max(0,time-activeClip.startSeconds);if(Math.abs(videoRef.current.currentTime-desired)>.2)videoRef.current.currentTime=desired;if(playing)void videoRef.current.play().catch(()=>{});else videoRef.current.pause();},[activeClip.id,activeClip.mediaType,time,playing]);
 useEffect(()=>{
   for(const track of Object.values(mix.tracks))for(const clip of track.clips){const el=audioRefs.current.get(track.id+":"+clip.cueId);if(!el||!clip.assetUrl)continue;const active=time>=clip.startSeconds&&time<clip.startSeconds+clip.durationSeconds;const muted=track.id==="dialogue"?muteDialogue:track.id==="music"?muteMusic:track.id==="ambience"?muteAmbience:muteEffects;if(!active||!playing||muted){el.pause();continue;}const local=Math.max(0,time-clip.startSeconds),desired=clip.loop&&el.duration>0?local%el.duration:local;if(Number.isFinite(desired)&&Math.abs(el.currentTime-desired)>.2)el.currentTime=desired;el.loop=clip.loop;const dialogueActive=mix.tracks.dialogue.clips.some(d=>time>=d.startSeconds&&time<d.startSeconds+d.durationSeconds);const db=dialogueActive&&clip.duckedGainDb!=null?clip.duckedGainDb:clip.gainDb;el.volume=Math.max(0,Math.min(1,Math.pow(10,db/20)));void el.play().catch(()=>{});}
 },[time,playing,muteDialogue,muteMusic,muteAmbience,muteEffects,mix]);

 const retry=async(cueId:string)=>{setRetrying(cueId);try{const r=await fetch(retryBase+"/cues/"+cueId+"/retry",{method:"POST"});if(r.ok){setStates(s=>s.map(x=>x.cueId===cueId?{...x,status:"PENDING",asset:null,errorCode:null}:x));setStatus("GENERATING");}}finally{setRetrying(null);}};

 return <main className={styles.root}>
  <header className={styles.hero}><div><span className={styles.eyebrow}>Episode Sound</span><h1>{timeline.identity.title}</h1><p>Dialogue + music + ambience + effects · Episode timing locked</p></div><button className={styles.primary} disabled>Mix & Master</button></header>
  <section className={styles.player}><div className={styles.viewport}>{activeClip.mediaType==="MOTION_VIDEO"?<video ref={videoRef} key={activeClip.id} src={activeClip.asset.url} muted playsInline/>:<img src={activeClip.asset.url} alt="Episode visual"/>}</div><div className={styles.controls}><button onClick={()=>setPlaying(v=>!v)}>{playing?"Pause":"Play Episode"}</button><span>{fmt(time)} / {fmt(timeline.targetDurationSeconds)}</span></div><input aria-label="Sound episode scrubber" type="range" min={0} max={timeline.targetDurationSeconds} step={.01} value={time} onChange={e=>setTime(Number(e.target.value))}/></section>

  <section className={styles.mutes}><button onClick={()=>setMuteDialogue(v=>!v)}>{muteDialogue?"Unmute Dialogue":"Mute Dialogue"}</button><button onClick={()=>setMuteMusic(v=>!v)}>{muteMusic?"Unmute Music":"Mute Music"}</button><button onClick={()=>setMuteAmbience(v=>!v)}>{muteAmbience?"Unmute Ambience":"Mute Ambience"}</button><button onClick={()=>setMuteEffects(v=>!v)}>{muteEffects?"Unmute Effects":"Mute Effects"}</button></section>

  <section className={styles.tracks}><span className={styles.eyebrow}>Audio Timeline</span>{(["dialogue","music","ambience","effects"] as const).map(track=><div className={styles.track} key={track}><strong>{track[0].toUpperCase()+track.slice(1)}</strong><div className={styles.trackLane}>{mix.tracks[track].clips.map(c=><span key={c.cueId} className={styles.segment} style={{left:(c.startSeconds/timeline.targetDurationSeconds*100)+"%",width:(c.durationSeconds/timeline.targetDurationSeconds*100)+"%"}} title={c.cueId}/>)}</div></div>)}</section>

  <section className={styles.cues}><span className={styles.eyebrow}>Sound Cues</span>{plan.cues.map(cue=>{const state=cue.type==="SILENCE"?null:stateByCue.get(cue.id);return <article className={cue.type==="SILENCE"?styles.silence:styles.cue} key={cue.id}><div><strong>{cue.type==="SILENCE"?"Intentional silence":cue.type+" · "+cueName(cue)}</strong><span>{fmt(cue.startSeconds)} · {cue.durationSeconds.toFixed(1)}s</span></div><p>{cue.storyPurpose}</p>{cue.type==="MUSIC"?<small>{cue.mood} · {Math.round(cue.energy*100)}% energy · {cue.purpose}</small>:null}{cue.type==="SILENCE"?<small>{cue.reason}</small>:<div className={styles.status}><span>{human(state?.status??cue.generationStatus)}</span>{state?.errorCode?<code>{state.errorCode}</code>:null}{state?.status==="FAILED"?<button disabled={retrying===cue.id} onClick={()=>void retry(cue.id)}>{retrying===cue.id?"Retrying…":"Retry cue"}</button>:null}</div>}</article>;})}</section>
  {plan.validation.warnings.length?<section className={styles.warnings}><span className={styles.eyebrow}>Editorial warnings</span><ul>{plan.validation.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></section>:null}

  {Object.entries(mix.tracks).flatMap(([track,t])=>t.clips.filter(c=>c.assetUrl).map(c=><audio key={track+":"+c.cueId} ref={el=>{if(el)audioRefs.current.set(track+":"+c.cueId,el);else audioRefs.current.delete(track+":"+c.cueId);}} src={c.assetUrl!} preload="metadata"/>))}
 </main>;
}
