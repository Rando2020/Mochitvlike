"use client";
import {useMemo,useState} from "react";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {CharacterPerformanceBible,ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {ProductionReferenceRecord,ReferenceProvenance} from "@/lib/production-references/types";
import {getAbilityProductionReadiness,getCharacterProductionReadiness} from "@/lib/production-references/readiness";
import styles from "./ProductionReferenceStudio.module.css";

const SLOTS:ReferenceSheetSlot[]=["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"];
const defaultProvenance=(source:ReferenceProvenance["source"]):ReferenceProvenance=>({source,creatorNameOrId:"",licenseIdOrDescription:"",sourceUrlOrRecord:null,permissions:{productionUse:null,commercialUse:null,modelConditioning:null,redistribution:null},projectSpecific:null,notes:null});

export function ProductionReferenceStudio({seriesId,blueprint,bibles,initialReferences}:{seriesId:string;blueprint:SeriesBlueprint;bibles:CharacterPerformanceBible[];initialReferences:ProductionReferenceRecord[]}){
 const [references,setReferences]=useState(initialReferences),[selectedCharacter,setSelectedCharacter]=useState(blueprint.cast[0]?.id??""),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 const member=blueprint.cast.find(c=>c.id===selectedCharacter)??blueprint.cast[0];
 const bible=bibles.find(b=>b.characterId===member?.id);
 const abilities=bible?.abilityKit??[];
 const characterReadiness=member?getCharacterProductionReadiness(member.id,references):"MISSING_PRIMARY_CHARACTER_REFERENCE";
 const refresh=async()=>{const r=await fetch(`/api/series/${seriesId}/production-references`,{cache:"no-store"});if(r.ok){const body=await r.json();setReferences(body.references);}};
 const upload=async(form:HTMLFormElement)=>{setBusy(true);setMessage(null);try{
  const data=new FormData(form),file=data.get("file");if(!(file instanceof File)||!file.size){setMessage("Choose an image first.");return;}
  const source=(data.get("source")||"OWNED") as ReferenceProvenance["source"],type=String(data.get("type")||"CHARACTER");
  const metadata:any={type,source,modelCompatibility:[],provenance:defaultProvenance(source),notes:String(data.get("notes")||"")||null};
  metadata.provenance.creatorNameOrId=String(data.get("creatorNameOrId")||"");
  metadata.provenance.licenseIdOrDescription=String(data.get("license")||"");\n  metadata.provenance.permissions={productionUse:data.get("productionUse")==="on",commercialUse:data.get("commercialUse")==="on",modelConditioning:data.get("modelConditioning")==="on",redistribution:data.get("redistribution")==="on"};\n  metadata.provenance.projectSpecific=source==="SYNTHETIC"?data.get("projectSpecific")==="on":null;
  if(type==="CHARACTER"){metadata.characterId=member.id;metadata.referenceRole=String(data.get("referenceRole")||"PRIMARY_IDENTITY");}
  if(type==="ABILITY"){metadata.characterId=member.id;metadata.abilityId=String(data.get("abilityId"));metadata.abilitySlot=String(data.get("abilitySlot"));}
  const body=new FormData();body.set("file",file);body.set("metadata",JSON.stringify(metadata));
  const response=await fetch(`/api/series/${seriesId}/production-references`,{method:"POST",body});const json=await response.json().catch(()=>null);
  if(!response.ok){setMessage(json?.error?.code??"Upload failed.");return;}setMessage("Reference uploaded for review.");form.reset();await refresh();
 }finally{setBusy(false);}};
 const act=async(id:string,action:"approve"|"reject"|"archive")=>{setBusy(true);setMessage(null);try{const r=await fetch(`/api/series/${seriesId}/production-references/${id}/${action}`,{method:"POST"});const b=await r.json().catch(()=>null);setMessage(r.ok?action==="approve"?"Reference approved for production.":"Reference updated.":b?.error?.code??"Reference update failed.");if(r.ok)await refresh();}finally{setBusy(false);}};
 const characterRefs=useMemo(()=>references.filter(r=>r.characterId===member?.id),[references,member?.id]);
 return <main className={styles.root}>
  <header className={styles.hero}><div><span>Production References</span><h1>{blueprint.identity.title}</h1><p>Approve visual identity and ability references before Production Frame rendering.</p></div><a href={`/series/${seriesId}`}>Back to Series Studio</a></header>
  {message?<p className={styles.message} role="status">{message}</p>:null}
  <div className={styles.layout}>
   <aside className={styles.characters}><h2>Characters</h2>{blueprint.cast.map(c=><button key={c.id} className={c.id===member?.id?styles.active:""} onClick={()=>setSelectedCharacter(c.id)}><strong>{c.name}</strong><span>{getCharacterProductionReadiness(c.id,references).replaceAll("_"," ")}</span></button>)}</aside>
   <section className={styles.content}>
    {member?<><div className={styles.sectionHead}><div><span>{member.role.replaceAll("_"," ")}</span><h2>{member.name}</h2><p>{member.visualConcept}</p></div><strong>{characterReadiness.replaceAll("_"," ")}</strong></div>
    <form className={styles.form} onSubmit={e=>{e.preventDefault();void upload(e.currentTarget);}}>
      <input type="hidden" name="type" value="CHARACTER"/><label>Identity image<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/></label>
      <label>Role<select name="referenceRole" defaultValue="PRIMARY_IDENTITY"><option>PRIMARY_IDENTITY</option><option>PROFILE</option><option>FULL_BODY</option><option>COSTUME</option><option>EXPRESSION</option><option>TURNAROUND</option><option>OTHER</option></select></label>
      <label>Source<select name="source" defaultValue="OWNED"><option>OWNED</option><option>COMMISSIONED</option><option>LICENSED</option><option>OPT_IN</option><option>PUBLIC_DOMAIN</option><option>SYNTHETIC</option></select></label>
      <label>Creator / rights holder<input name="creatorNameOrId" required/></label><label>License or rights record<input name="license" required/></label>
      <button disabled={busy}>Upload character reference</button>
    </form>
    <div className={styles.cards}>{characterRefs.filter(r=>r.type==="CHARACTER").map(r=><article key={r.id}><img src={r.assetUrl} alt={`${member.name} ${r.referenceRole??"reference"}`}/><div><strong>{r.referenceRole?.replaceAll("_"," ")}</strong><span>{r.status.replaceAll("_"," ")}</span><small>{r.source} · {r.visualMetadata.width}×{r.visualMetadata.height}</small></div><div className={styles.actions}>{r.status==="REVIEW_REQUIRED"?<button disabled={busy} onClick={()=>void act(r.id,"approve")}>Approve</button>:null}{!["ARCHIVED"].includes(r.status)?<button disabled={busy} onClick={()=>void act(r.id,"archive")}>Archive</button>:null}</div></article>)}</div>
    {abilities.map(ability=>{const readiness=getAbilityProductionReadiness(member.id,ability.id,bible!,references);return <section key={ability.id} className={styles.ability}><div className={styles.sectionHead}><div><span>Ability</span><h3>{ability.identity.name}</h3><p>{ability.concept.summary}</p></div><strong>{readiness.replaceAll("_"," ")}</strong></div>
      <div className={styles.slots}>{SLOTS.map(slot=>{const ref=references.find(r=>r.type==="ABILITY"&&r.abilityId===ability.id&&r.abilitySlot===slot&&r.status!=="ARCHIVED");return <div key={slot}><strong>{slot.replaceAll("_"," ")}</strong><span>{ref?ref.status.replaceAll("_"," "):"Missing"}</span></div>})}</div>
      <form className={styles.form} onSubmit={e=>{e.preventDefault();void upload(e.currentTarget);}}><input type="hidden" name="type" value="ABILITY"/><input type="hidden" name="abilityId" value={ability.id}/>
       <label>Ability reference<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/></label><label>Slot<select name="abilitySlot">{SLOTS.map(s=><option key={s}>{s}</option>)}</select></label>
       <label>Source<select name="source" defaultValue="OWNED"><option>OWNED</option><option>COMMISSIONED</option><option>LICENSED</option><option>OPT_IN</option><option>PUBLIC_DOMAIN</option><option>SYNTHETIC</option></select></label>
       <label>Creator / rights holder<input name="creatorNameOrId" required/></label><label>License or rights record<input name="license" required/></label><fieldset><legend>Rights declaration</legend><label><input type="checkbox" name="productionUse" required/> Production use</label><label><input type="checkbox" name="commercialUse" required/> Commercial use</label><label><input type="checkbox" name="modelConditioning" required/> Model conditioning</label><label><input type="checkbox" name="redistribution"/> Redistribution permitted</label><label><input type="checkbox" name="projectSpecific"/> Synthetic asset was created specifically for this Series</label></fieldset><button disabled={busy}>Upload ability reference</button>
      </form>
      <div className={styles.cards}>{characterRefs.filter(r=>r.type==="ABILITY"&&r.abilityId===ability.id).map(r=><article key={r.id}><img src={r.assetUrl} alt={`${ability.identity.name} ${r.abilitySlot}`}/><div><strong>{r.abilitySlot?.replaceAll("_"," ")}</strong><span>{r.status.replaceAll("_"," ")}</span><small>{r.source}</small></div><div className={styles.actions}>{r.status==="REVIEW_REQUIRED"?<button disabled={busy} onClick={()=>void act(r.id,"approve")}>Approve</button>:null}</div></article>)}</div>
    </section>})}</>:null}
   </section>
  </div>
 </main>;
}
