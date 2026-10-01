import type {BenchmarkCharacter,VisualBenchmarkScenario,BenchmarkCategory} from "./types";

export const BENCHMARK_CHARACTERS:readonly BenchmarkCharacter[]=[
 {id:"kael",name:"Kael",appearance:"adult man with warm brown skin, short black curls, amber eyes, narrow scar through the left eyebrow",costume:"charcoal field jacket over a rust shirt, brass clasp, dark trousers",palette:["charcoal","rust","brass","amber"]},
 {id:"lyra",name:"Lyra",appearance:"adult woman with olive skin, long silver-black hair braided over one shoulder, teal eyes, small beauty mark beneath the right eye",costume:"deep teal fitted coat, cream high collar, silver geometric earrings",palette:["deep teal","cream","silver","black"]},
 {id:"mira",name:"Mira",appearance:"adult woman with dark brown skin, cropped copper curls, violet eyes, round wire-frame glasses",costume:"indigo utility vest over a pale gray blouse, leather notebook strap",palette:["indigo","copper","gray","violet"]},
 {id:"vesper",name:"Vesper",appearance:"adult androgynous rival with pale freckled skin, chin-length auburn hair, gray-green eyes",costume:"black asymmetric coat with crimson lining and a single obsidian shoulder guard",palette:["black","crimson","obsidian","gray-green"]}
] as const;

function character(id:string){const c=BENCHMARK_CHARACTERS.find(x=>x.id===id);if(!c)throw new Error("UNKNOWN_BENCHMARK_CHARACTER");return c;}
function seed(id:string){let h=2166136261;for(const ch of id){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function prompt(ids:string[],instruction:string){
 const cast=ids.map(id=>{const c=character(id);return c.name+": "+c.appearance+"; "+c.costume+"."}).join(" ");
 return cast+" Original fictional characters. "+instruction+" No text, logos, copyrighted characters, franchise costumes, or celebrity likeness.";
}
function s(id:string,category:BenchmarkCategory,title:string,ids:string[],instruction:string,poseReference:string|null=null):VisualBenchmarkScenario{
 return{id,category,title,prompt:prompt(ids,instruction),characterIds:ids,seed:seed(id),references:ids.map(x=>"benchmark://character/"+x),poseReference};
}

export const VISUAL_BENCHMARK_SCENARIOS:readonly VisualBenchmarkScenario[]=[
 s("char-closeup","CHARACTER_IDENTITY","Protagonist close-up",["kael"],"Anime production close-up, neutral expression, clean cel shading, eye-level camera."),
 s("char-profile","CHARACTER_IDENTITY","Protagonist profile",["kael"],"Strict left profile portrait, same facial identity and costume."),
 s("char-fullbody","CHARACTER_IDENTITY","Protagonist full body",["kael"],"Full-body standing production frame, entire costume visible.", "benchmark://pose/standing"),
 s("char-expression","CHARACTER_IDENTITY","Expression change",["kael"],"Close-up with restrained grief while preserving identity."),
 s("char-angle","CHARACTER_IDENTITY","Camera angle change",["kael"],"Three-quarter low-angle medium shot while preserving face and costume."),
 s("char-lighting","CHARACTER_IDENTITY","Lighting change",["kael"],"Same character under cool moonlight with warm rim light."),

 s("multi-two","MULTI_CHARACTER","Two-character identity",["kael","lyra"],"Two-shot conversation, each character visually distinct and correctly costumed."),
 s("multi-three","MULTI_CHARACTER","Three-character identity",["kael","lyra","mira"],"Three-character group frame with clear identity separation."),
 s("multi-separation","MULTI_CHARACTER","Identity separation",["lyra","mira"],"Medium two-shot, prevent hair, eye, clothing, or accessory swapping."),
 s("multi-costume","MULTI_CHARACTER","Stable costume attribution",["kael","vesper"],"Confrontation frame, preserve each character's assigned coat and palette."),
 s("multi-attributes","MULTI_CHARACTER","Attribute attribution",["lyra","vesper"],"Close two-shot, preserve Lyra's braid/earrings and Vesper's freckles/shoulder guard."),

 s("pose-standing","POSE_COMPOSITION","Standing pose",["lyra"],"Relaxed standing pose, centered medium-full composition.","benchmark://pose/standing"),
 s("pose-running","POSE_COMPOSITION","Running pose",["kael"],"Dynamic lateral running action keyframe with readable anatomy.","benchmark://pose/running"),
 s("pose-fight","POSE_COMPOSITION","Fight composition",["kael","vesper"],"Two-person defensive combat stance, no contact gore.","benchmark://pose/duel"),
 s("pose-seated","POSE_COMPOSITION","Seated dialogue",["lyra","mira"],"Seated dialogue at a small table, balanced two-shot.","benchmark://pose/seated"),
 s("pose-ots","POSE_COMPOSITION","Over shoulder",["kael","lyra"],"Over-the-shoulder shot from Kael toward Lyra."),
 s("pose-low","POSE_COMPOSITION","Low angle",["vesper"],"Dramatic low-angle medium shot."),
 s("pose-high","POSE_COMPOSITION","High angle",["mira"],"High-angle medium-full shot looking down."),
 s("pose-xcu","POSE_COMPOSITION","Extreme close-up",["lyra"],"Extreme close-up of eyes and upper face, preserve teal eyes and beauty mark."),
 s("pose-wide","POSE_COMPOSITION","Wide establishing",["kael","lyra"],"Wide establishing shot in a quiet rain-soaked station platform, characters small in frame."),

 s("cont-room-reverse","CONTINUITY","Room reverse angle",["mira","lyra"],"Same indigo-walled archive room from reverse angle, same desk, lamp, shelves and seating arrangement."),
 s("cont-exterior","CONTINUITY","Exterior continuity",["kael"],"Same rain-soaked station exterior as previous wide shot, alternate camera position, preserve signs and architecture without readable text."),
 s("cont-prop","CONTINUITY","Recurring prop",["mira"],"Medium shot holding the same worn brown leather notebook with brass corner guards."),
 s("cont-costume","CONTINUITY","Recurring costume",["vesper"],"Different pose and camera angle, identical black coat, crimson lining and obsidian shoulder guard."),
 s("cont-palette","CONTINUITY","Palette continuity",["kael","lyra"],"Production frame preserving the established charcoal/rust and teal/cream character palettes in subdued rainy lighting."),

 s("anime-cel","ANIME","Cel production frame",["kael"],"Clean 2D anime production frame, controlled line weight, two-tone cel shading, restrained texture."),
 s("anime-action","ANIME","Action keyframe",["kael","vesper"],"High-energy anime action keyframe with readable silhouettes and speed emphasis."),
 s("anime-emotion","ANIME","Emotional close-up",["lyra"],"Quiet emotional anime close-up, subtle wet eyes, controlled facial anatomy."),
 s("anime-comedy","ANIME","Comedy reaction",["mira"],"Anime comedy reaction frame with simplified expressive features while preserving identity."),
 s("anime-darkfantasy","ANIME","Dark fantasy environment",["kael"],"Wide dark-fantasy ruin at blue hour, character identity readable but environment dominant."),

 s("manga-mono","MANGA","Monochrome panel",["kael"],"Black-and-white manga panel, clean inks, no grayscale painting, no lettering."),
 s("manga-lineart","MANGA","Lineart panel",["lyra"],"Precise monochrome manga lineart portrait with controlled hatching."),
 s("manga-screentone","MANGA","Screentone panel",["mira"],"Manga medium shot using screentone values and clean black fills."),
 s("manga-action","MANGA","Action panel",["kael","vesper"],"Diagonal manga action panel composition, speed lines, readable bodies, no text."),
 s("manga-dialogue","MANGA","Dialogue panel",["lyra","mira"],"Quiet two-character manga dialogue panel with intentional empty balloon-safe negative space but no lettering."),
 s("manga-environment","MANGA","Environment panel",["kael"],"Wide monochrome manga environment panel of the rainy station, strong perspective and texture.")
] as const;

export function scenariosByCategory(category:BenchmarkCategory){return VISUAL_BENCHMARK_SCENARIOS.filter(s=>s.category===category);}
