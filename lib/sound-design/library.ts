import type {SoundCue,SoundLibraryProvider,LibrarySoundAsset} from "./types";
type ManifestEntry=LibrarySoundAsset&{match:{type:"AMBIENCE"|"SFX"|"FOLEY";label:string}};
function cueLabel(cue:SoundCue){return cue.type==="AMBIENCE"?cue.environment:cue.type==="SFX"?cue.event:cue.type==="FOLEY"?cue.action:null;}
export class EnvironmentSoundLibraryProvider implements SoundLibraryProvider{
 private readonly entries:ManifestEntry[];
 constructor(raw=process.env.SOUND_LIBRARY_MANIFEST_JSON??"[]"){try{const parsed=JSON.parse(raw);this.entries=Array.isArray(parsed)?parsed:[];}catch{this.entries=[];}}
 async resolve(cue:SoundCue){
   const label=cueLabel(cue);if(!label||cue.type==="MUSIC"||cue.type==="SILENCE")return null;
   const found=this.entries.find(e=>e.match.type===cue.type&&e.match.label.toLowerCase()===label.toLowerCase());
   return found?{key:found.key,url:found.url,storagePath:found.storagePath,mimeType:found.mimeType,durationSeconds:found.durationSeconds,loopable:found.loopable}:null;
 }
}
