import type {MusicCue,AmbienceCue,SfxCue,FoleyCue} from "./types";
import {soundChecksum} from "./id";

const MUSIC_TERMS=["orchestral","ambient","electronic","synth","synthwave","piano","strings","percussion","acoustic","cinematic","choral","jazz","rock","pop","hip-hop","lo-fi","dark","warm","bright","tense","melancholic","playful","mysterious","minimal","dramatic","ethereal","industrial","fantasy","sci-fi","comedic","emotional","suspenseful","rhythmic","slow","fast"];
function safeTerms(text:string){const low=text.toLowerCase();return MUSIC_TERMS.filter(t=>low.includes(t));}
export function buildMusicGenerationPrompt(cue:MusicCue){
 const terms=[...new Set([...safeTerms(cue.musicDirection),...safeTerms(cue.mood),cue.purpose.toLowerCase()])].slice(0,12);
 const prompt=[
  "Instrumental background underscore for a short-form animated series scene.",
  "Purpose: "+cue.purpose.toLowerCase()+".",
  "Energy: "+Math.round(cue.energy*100)+" percent.",
  terms.length?"Safe style descriptors: "+terms.join(", ")+".":"",
  "No vocals. No lyrics. No artist imitation. No song imitation. No recognizable copyrighted melody.",
  "Support dialogue and story without dominating the scene."
 ].filter(Boolean).join(" ");
 return{prompt,version:"1.0" as const,checksum:soundChecksum({version:"1.0",prompt})};
}
export function buildEffectGenerationPrompt(cue:AmbienceCue|SfxCue|FoleyCue){
 const prompt=cue.type==="AMBIENCE"
  ?["Seamless environmental ambience.",cue.environment,...cue.characteristics,"No music. No voices. No dialogue."].flat().join(" ")
  :cue.type==="SFX"
    ?["Clean isolated cinematic sound effect.",cue.event,"Intensity "+Math.round(cue.intensity*100)+" percent.","No music. No voices. No extra events."].join(" ")
    :["Clean isolated Foley recording.",cue.action,cue.material?"Material: "+cue.material+".":"","No music. No voices. No extra actions."].filter(Boolean).join(" ");
 return{prompt,version:"1.0" as const,checksum:soundChecksum({version:"1.0",prompt})};
}
