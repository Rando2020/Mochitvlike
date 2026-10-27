"use client";
import {useMemo,useState} from "react";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {CharacterPerformanceBible,ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {ProductionReferenceRecord,ReferenceProvenance} from "@/lib/production-references/types";
import {getAbilityProductionReadiness,getCharacterProductionReadiness,type CharacterBindingReadiness} from "@/lib/production-references/readiness";
import styles from "./ProductionReferenceStudio.module.css";
import {ReferenceRightsEditor} from "./ReferenceRightsEditor";
import {SheetViewImporter} from "./SheetViewImporter";
import {readSheetViewLineage} from "@/lib/production-references/sheet-view-schema";

const SLOTS:ReferenceSheetSlot[]=["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"];
const defaultProvenance=(source:ReferenceProvenance["source"]):ReferenceProvenance=>({source,creatorNameOrId:"",licenseIdOrDescription:"",sourceUrlOrRecord:null,permissions:{productionUse:null,commercialUse:null,modelConditioning:null,redistribution:null},projectSpecific:null,notes:null});

export function ProductionReferenceStudio({seriesId,blueprint,bibles,initialReferences,bindingStates={}}:{seriesId:string;blueprint:SeriesBlueprint;bibles:CharacterPerformanceBible[];initialReferences:ProductionReferenceRecord[];bindingStates?:Record<string,CharacterBindingReadiness>}){
 const [references,setReferences]=useState(initialReferences),[selectedCharacter,setSelectedCharacter]=useState(blueprint.cast[0]?.id??""),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 const member=blueprint.cast.find(c=>c.id===selectedCharacter)??blueprint.cast[0];
 const bible=bibles.find(b=>b.characterId===member?.id);
 const abilities=bible?.abilityKit??[];
 const characterReadiness=member?getCharacterProductionReadiness(member.id,references,bindingStates[member.id]):"MISSING_PRIMARY_CHARACTER_REFERENCE";
 const refresh=async()=>{const r=await fetch(`/api/series/${seriesId}/production-references`,{cache:"no-store"});if(!r.ok)throw new Error("REFERENCE_REFRESH_FAILED");const body=await r.json();setReferences(body.references);};
 const upload=async(form:HTMLFormElement)=>{setBusy(true);setMessage(null);try{
  const data=new FormData(form),file=data.get("file");if(!(file instanceof File)||!file.size){setMessage("Choose an image first.");return;}
  const source=(data.get("source")||"OWNED") as ReferenceProvenance["source"],type=String(data.get("type")||"CHARACTER");
  const metadata:any={type,source,modelCompatibility:[],provenance:defaultProvenance(source),notes:String(data.get("notes")||"")||null};
  metadata.provenance.creatorNameOrId=String(data.get("creatorNameOrId")||"").trim()||null;
  metadata.provenance.licenseIdOrDescription=String(data.get("license")||"").trim()||null;
  metadata.provenance.permissions={productionUse:data.get("productionUse")==="on"?true:null,commercialUse:data.get("commercialUse")==="on"?true:null,modelConditioning:data.get("modelConditioning")==="on"?true:null,redistribution:data.get("redistribution")==="on"?true:null};
  metadata.provenance.projectSpecific=source==="SYNTHETIC"?(data.get("projectSpecific")==="on"?true:null):null;
  if(type==="CHARACTER"){metadata.characterId=member.id;metadata.referenceRole=String(data.get("referenceRole")||"PRIMARY_IDENTITY");}
  if(type==="ABILITY"){metadata.characterId=member.id;metadata.abilityId=String(data.get("abilityId"));metadata.abilitySlot=String(data.get("abilitySlot"));}
  const body=new FormData();body.set("file",file);body.set("metadata",JSON.stringify(metadata));
  const response=await fetch(`/api/series/${seriesId}/production-references`,{method:"POST",body});const json=await response.json().catch(()=>null);
  if(!response.ok){setMessage(json?.error?.code??"Upload failed.");return;}setMessage("Reference stored for review. Unattested rights remain undecided and block production approval.");form.reset();await refresh();
 }finally{setBusy(false);}};
 const importVeyaFromRepo=async()=>{
  if(busy||seriesId!=="70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892"||member?.id!=="char_veya")return;
  setBusy(true);setMessage(null);
  try{
    const response=await fetch(`/api/series/${seriesId}/production-references/import-veya`,{method:"POST"});
    const result=await response.json().catch(()=>null);
    if(!response.ok){setMessage(result?.error?.code??"Source import could not be confirmed. Reload references before retrying.");return;}
    await refresh();
    setMessage(result.alreadyExists?
      "The exact original Veya source is already registered. No duplicate was created.":
      "Original Veya source saved for review with all rights unconfirmed. Choose it in the crop importer below.");
  }catch{setMessage("Import response uncertain. Refresh and inspect references before trying again.");}
  finally{setBusy(false);}
 };
 const act=async(id:string,action:"approve"|"reject"|"archive")=>{setBusy(true);setMessage(null);try{const r=await fetch(`/api/series/${seriesId}/production-references/${id}/${action}`,{method:"POST"});const b=await r.json().catch(()=>null);setMessage(r.ok?action==="approve"?"Reference approved for production.":"Reference updated.":b?.error?.code??"Reference update failed.");if(r.ok)await refresh();}finally{setBusy(false);}};
 const characterRefs=useMemo(()=>references.filter(r=>r.characterId===member?.id),[references,member?.id]);
 return <main className={styles.root}>
  <header className={styles.hero}><div><span>Production References</span><h1>{blueprint.identity.title}</h1><p>Approve visual identity and ability references before Production Frame rendering.</p></div><a href={`/series/${seriesId}`}>Back to Series Studio</a></header>
  {message?<p className={styles.message} role="status">{message}</p>:null}
  <div className={styles.layout}>
   <aside className={styles.characters}><h2>Characters</h2>{blueprint.cast.map(c=><button key={c.id} className={c.id===member?.id?styles.active:""} onClick={()=>setSelectedCharacter(c.id)}><strong>{c.name}</strong><span>{getCharacterProductionReadiness(c.id,references,bindingStates[c.id]).replaceAll("_"," ")}</span></button>)}</aside>
   <section className={styles.content}>
    {member?<><div className={styles.sectionHead}><div><span>{member.role.replaceAll("_"," ")}</span><h2>{member.name}</h2><p>{member.visualConcept}</p></div><strong>{characterReadiness.replaceAll("_"," ")}</strong></div>
    {seriesId==="70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892"&&member.id==="char_veya"?
      <section aria-label="Veya source from GitHub">
        <h3>Import Veya's verified source sheet</h3>
        <p>Import the exact original image already committed to GitHub. This saves a synthetic OTHER reference for review only. Rights remain unknown, no approval or model generation occurs.</p>
        <button type="button" disabled={busy} onClick={()=>void importVeyaFromRepo()}>Import Veya source for review</button>
      </section>:null}
    <SheetViewImporter key={member.id} seriesId={seriesId} characterId={member.id} references={references} onSaved={refresh}/>
    <form className={styles.form} onSubmit={e=>{e.preventDefault();void upload(e.currentTarget);}}>
      <input type="hidden" name="type" value="CHARACTER"/><label>Identity image<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/></label>
      <label>Role<select name="referenceRole" defaultValue="PRIMARY_IDENTITY"><option>PRIMARY_IDENTITY</option><option>PROFILE</option><option>FULL_BODY</option><option>COSTUME</option><option>EXPRESSION</option><option>TURNAROUND</option><option>OTHER</option></select></label>
      <label>Source<select name="source" defaultValue="OWNED"><option>OWNED</option><option>COMMISSIONED</option><option>LICENSED</option><option>OPT_IN</option><option>PUBLIC_DOMAIN</option><option>SYNTHETIC</option></select></label>
      <label>Creator / rights holder (optional until approval)<input name="creatorNameOrId"/></label><label>License or rights record (optional until approval)<input name="license"/></label>
      <fieldset><legend>Character reference rights</legend><label><input type="checkbox" name="productionUse"/> I attest production use rights</label><label><input type="checkbox" name="commercialUse"/> I attest commercial use rights</label><label><input type="checkbox" name="modelConditioning"/> I attest model-conditioning rights</label><label><input type="checkbox" name="redistribution"/> Redistribution permitted</label><label><input type="checkbox" name="projectSpecific"/> Synthetic asset was created specifically for this Series</label></fieldset>
      <p>Upload for review without attesting rights. Unchecked rights stay unknown, and this asset cannot be approved or used for generation until rights are reviewed.</p><button disabled={busy}>Upload character reference</button>
    </form>
    <div className={styles.cards}>{characterRefs.filter(r=>r.type==="CHARACTER").map(r=><article key={r.id}><img src={r.assetUrl} alt={`${member.name} ${r.referenceRole??"reference"}`}/><div><strong>{r.referenceRole?.replaceAll("_"," ")}</strong><span>{r.status.replaceAll("_"," ")}</span>{readSheetViewLineage(r.visualMetadata.notes)?<small>{readSheetViewLineage(r.visualMetadata.notes)!.label} · Source {readSheetViewLineage(r.visualMetadata.notes)!.sourceReferenceId.slice(0,8)} · original preserved</small>:null}<small>{r.source} · {r.visualMetadata.width}×{r.visualMetadata.height}</small></div><ReferenceRightsEditor key={`${r.id}:${r.updatedAt}:${r.version}:${r.status}`} seriesId={seriesId} reference={r} onSaved={refresh}/><div className={styles.actions}>{r.status==="REVIEW_REQUIRED"?<button disabled={busy} onClick={()=>void act(r.id,"approve")}>Approve</button>:null}{!["ARCHIVED"].includes(r.status)?<button disabled={busy} onClick={()=>void act(r.id,"archive")}>Archive</button>:null}</div></article>)}</div>
    {abilities.map(ability=>{const readiness=getAbilityProductionReadiness(member.id,ability.id,bible!,references);return <section key={ability.id} className={styles.ability}><div className={styles.sectionHead}><div><span>Ability</span><h3>{ability.identity.name}</h3><p>{ability.concept.summary}</p></div><strong>{readiness.replaceAll("_"," ")}</strong></div>
      <div className={styles.slots}>{SLOTS.map(slot=>{const ref=references.find(r=>r.type==="ABILITY"&&r.abilityId===ability.id&&r.abilitySlot===slot&&r.status!=="ARCHIVED");return <div key={slot}><strong>{slot.replaceAll("_"," ")}</strong><span>{ref?ref.status.replaceAll("_"," "):"Missing"}</span></div>})}</div>
      <form className={styles.form} onSubmit={e=>{e.preventDefault();void upload(e.currentTarget);}}><input type="hidden" name="type" value="ABILITY"/><input type="hidden" name="abilityId" value={ability.id}/>
       <label>Ability reference<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required/></label><label>Slot<select name="abilitySlot">{SLOTS.map(s=><option key={s}>{s}</option>)}</select></label>
       <label>Source<select name="source" defaultValue="OWNED"><option>OWNED</option><option>COMMISSIONED</option><option>LICENSED</option><option>OPT_IN</option><option>PUBLIC_DOMAIN</option><option>SYNTHETIC</option></select></label>
       <label>Creator / rights holder (optional until approval)<input name="creatorNameOrId"/></label><label>License or rights record (optional until approval)<input name="license"/></label><fieldset><legend>Rights declaration</legend><label><input type="checkbox" name="productionUse"/> Production use</label><label><input type="checkbox" name="commercialUse"/> Commercial use</label><label><input type="checkbox" name="modelConditioning"/> Model conditioning</label><label><input type="checkbox" name="redistribution"/> Redistribution permitted</label><label><input type="checkbox" name="projectSpecific"/> Synthetic asset was created specifically for this Series</label></fieldset><p>Unchecked rights stay unknown. Uploading does not approve this ability reference.</p><button disabled={busy}>Upload ability reference</button>
      </form>
      <div className={styles.cards}>{characterRefs.filter(r=>r.type==="ABILITY"&&r.abilityId===ability.id).map(r=><article key={r.id}><img src={r.assetUrl} alt={`${ability.identity.name} ${r.abilitySlot}`}/><div><strong>{r.abilitySlot?.replaceAll("_"," ")}</strong><span>{r.status.replaceAll("_"," ")}</span><small>{r.source}</small></div><ReferenceRightsEditor key={`${r.id}:${r.updatedAt}:${r.version}:${r.status}`} seriesId={seriesId} reference={r} onSaved={refresh}/><div className={styles.actions}>{r.status==="REVIEW_REQUIRED"?<button disabled={busy} onClick={()=>void act(r.id,"approve")}>Approve</button>:null}</div></article>)}</div>
    </section>})}</>:null}
   </section>
  </div>
 </main>;
}
