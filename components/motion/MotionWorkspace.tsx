"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import type {MotionPlan,MotionPlanStatus} from "@/lib/motion/types";
import styles from "./MotionWorkspace.module.css";

export function MotionWorkspace({initialPlan,initialStatus,statusEndpoint,retryBase,assemblyBase,latestAssembly}:{
  initialPlan:MotionPlan;initialStatus:MotionPlanStatus;statusEndpoint:string;retryBase:string;assemblyBase:string;latestAssembly?:{id:string}|null;
}){
  const router=useRouter();
  const [plan,setPlan]=useState(initialPlan);
  const [status,setStatus]=useState<MotionPlanStatus>(initialStatus);
  const [retrying,setRetrying]=useState<string|null>(null);
  const [activeIndex,setActiveIndex]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [assemblyBusy,setAssemblyBusy]=useState(false);
  const [assemblyError,setAssemblyError]=useState<string|null>(null);
  const stillTimer=useRef<number|undefined>(undefined);
  const terminal=status==="READY"||status==="PARTIAL"||status==="FAILED"||status==="ARCHIVED";

  useEffect(()=>{
    if(terminal)return;
    let cancelled=false,timer:number|undefined;
    const poll=async()=>{
      if(document.visibilityState==="hidden"){timer=window.setTimeout(poll,5000);return;}
      const response=await fetch(statusEndpoint,{cache:"no-store"});
      if(response.ok&&!cancelled){
        const body=await response.json(),remote=body.motionPlan;
        setStatus(remote.status);
        setPlan(current=>({...current,clips:current.clips.map(clip=>{
          const next=remote.clips.find((x:{id:string})=>x.id===clip.id);
          return next?{...clip,generationStatus:next.generationStatus,outputAsset:next.outputAsset}:clip;
        })}));
        if(!["READY","PARTIAL","FAILED","ARCHIVED"].includes(remote.status))timer=window.setTimeout(poll,remote.pollAfterMs??3000);
      }else if(!cancelled)timer=window.setTimeout(poll,5000);
    };
    timer=window.setTimeout(poll,3000);
    const visible=()=>{if(document.visibilityState==="visible"){if(timer)clearTimeout(timer);void poll();}};
    document.addEventListener("visibilitychange",visible);
    return()=>{cancelled=true;if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",visible);};
  },[statusEndpoint,terminal]);

  const resolved=plan.clips.filter(c=>c.generationStatus==="COMPLETED"||c.generationStatus==="SKIPPED").length;
  const progress=Math.round(resolved/Math.max(1,plan.clips.length)*100);
  const active=plan.clips[activeIndex];
  const label=(s:string)=>s==="COMPLETED"?"Ready":s==="FAILED"?"Needs retry":s==="SKIPPED"?"Held as still":s==="GENERATING"?"Animating…":"Waiting";
  const next=()=>setActiveIndex(i=>Math.min(plan.clips.length-1,i+1));
  const prev=()=>setActiveIndex(i=>Math.max(0,i-1));

  useEffect(()=>{
    if(stillTimer.current)window.clearTimeout(stillTimer.current);
    if(!playing)return;
    if(active.generationStatus==="SKIPPED"){
      stillTimer.current=window.setTimeout(()=>{
        if(activeIndex>=plan.clips.length-1)setPlaying(false);else next();
      },Math.max(500,active.targetDurationSeconds*1000));
    }else if(active.generationStatus!=="COMPLETED"){
      setPlaying(false);
    }
    return()=>{if(stillTimer.current)window.clearTimeout(stillTimer.current);};
  },[playing,activeIndex,active.generationStatus,active.targetDurationSeconds,plan.clips.length]);

  const retry=async(clipId:string)=>{
    setRetrying(clipId);
    try{
      const response=await fetch(retryBase+"/clips/"+clipId+"/retry",{method:"POST"});
      if(response.ok){
        setPlan(current=>({...current,clips:current.clips.map(c=>c.id===clipId?{...c,generationStatus:"PENDING",outputAsset:null}:c)}));
        setStatus("GENERATING");
      }
    }finally{setRetrying(null);}
  };

  const assembleEpisode=async()=>{
    const publicBase=assemblyBase.replace("/api/series","/series");
    if(latestAssembly){router.push(publicBase+"/assemblies/"+latestAssembly.id);return;}
    setAssemblyBusy(true);setAssemblyError(null);
    try{
      const response=await fetch(assemblyBase+"/assemblies/generate",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode:"INITIAL",motionPlanIds:[plan.id]})
      });
      if(!response.ok){const body=await response.json().catch(()=>null);setAssemblyError(body?.error?.code??"EPISODE_ASSEMBLY_FAILED");return;}
      const body=await response.json();router.push(publicBase+"/assemblies/"+body.episodeAssembly.id);
    }finally{setAssemblyBusy(false);}
  };

  return <main className={styles.root}>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Motion</span><h1>{plan.identity.title}</h1><p>{resolved}/{plan.clips.length} clips resolved · {progress}%</p></div>
      <button className={styles.primary} disabled={assemblyBusy||status!=="READY"} onClick={()=>void assembleEpisode()}>{assemblyBusy?"Assembling…":latestAssembly?"Open Episode Assembly":"Assemble Episode"}</button>
    </header>
    {assemblyError?<p role="alert">{assemblyError==="EPISODE_MOTION_INCOMPLETE"?"Finish every motion clip before assembling the episode.":"The episode could not be assembled safely yet."}</p>:null}

    <div className={styles.progress}><div style={{width:progress+"%"}}/><span>{progress}% ready</span></div>

    <section className={styles.preview}>
      <div className={styles.viewport}>
        {active.generationStatus==="COMPLETED"&&active.outputAsset
          ?<video key={active.id} src={active.outputAsset.url} muted playsInline controls={!playing} autoPlay={playing}
             onEnded={()=>{if(activeIndex>=plan.clips.length-1)setPlaying(false);else next();}}/>
          :<img src={active.inputAsset.url} alt={"Motion clip "+(active.sequenceIndex+1)+": "+active.motionIntent.emotionalIntent}/>}
        <span className={styles.badge}>{label(active.generationStatus)}</span>
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={prev} disabled={activeIndex===0}>Previous</button>
        <button type="button" onClick={()=>setPlaying(v=>!v)} disabled={active.generationStatus==="PENDING"||active.generationStatus==="GENERATING"||active.generationStatus==="FAILED"}>{playing?"Pause preview":"Play preview"}</button>
        <button type="button" onClick={next} disabled={activeIndex===plan.clips.length-1}>Next</button>
      </div>
      <p>Clip {activeIndex+1} · target {active.targetDurationSeconds.toFixed(1)}s · {active.motionIntent.emotionalIntent}</p>
    </section>

    <section className={styles.grid}>
      {plan.clips.map((clip,index)=><article key={clip.id} className={index===activeIndex?styles.activeCard:styles.card}>
        <button className={styles.select} type="button" onClick={()=>setActiveIndex(index)}>
          <div className={styles.thumb}>
            {clip.generationStatus==="COMPLETED"&&clip.outputAsset?<video src={clip.outputAsset.url} muted preload="metadata"/>:<img src={clip.inputAsset.url} alt=""/>}
            <span>{String(index+1).padStart(2,"0")}</span>
          </div>
          <div className={styles.body}><strong>{label(clip.generationStatus)}</strong><small>{clip.targetDurationSeconds.toFixed(1)}s target</small><p>{clip.motionIntent.subjectMotion}</p></div>
        </button>
        {clip.generationStatus==="FAILED"?<button type="button" onClick={()=>void retry(clip.id)} disabled={retrying===clip.id}>{retrying===clip.id?"Retrying…":"Retry motion"}</button>:null}
      </article>)}
    </section>
  </main>;
}
