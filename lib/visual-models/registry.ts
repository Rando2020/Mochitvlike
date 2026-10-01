import type {VisualFoundationModel} from "./types";
import {assertProductionStatus} from "./licenses";

export const VISUAL_FOUNDATION_MODELS:readonly VisualFoundationModel[]=[
  {
    id:"animagine-xl-4.0",
    displayName:"Animagine XL 4.0",
    source:{provider:"HUGGING_FACE",repository:"cagliostrolab/animagine-xl-4.0",revision:"2b7c1b397761bf5bd3cc42e5b39ec99314a75a96",artifactChecksum:"1d5b43ff75b6ab598502d4c779d2fbfa3dceca51c60c3b609640a60772333916"},
    architecture:"SDXL",
    capabilities:{textToImage:true,imageToImage:true,inpainting:true,lora:true,ipAdapter:true,controlNet:true},
    license:{identifier:"openrail++",commercialUse:"REVIEW_REQUIRED",trainingDerivatives:"REVIEW_REQUIRED",redistribution:"REVIEW_REQUIRED",notes:["Anime-focused SDXL candidate.","OpenRAIL++ rights and downstream obligations require product/legal review before APPROVED status."],verifiedAt:"2026-09-30",sourceUrl:"https://huggingface.co/cagliostrolab/animagine-xl-4.0"},
    productionStatus:"CANDIDATE"
  },
  {
    id:"illustrious-xl-v2.0",
    displayName:"Illustrious XL v2.0 Stable",
    source:{provider:"HUGGING_FACE",repository:"OnomaAIResearch/Illustrious-XL-v2.0",revision:"69459c1fe6f46db41ab31e6114f05acc0e06bcaa",artifactChecksum:"c2a1a3eaa13d4c107dc7e00c3fe830cab427aa026362740ea094745b3422a331"},
    architecture:"SDXL",
    capabilities:{textToImage:true,imageToImage:true,inpainting:true,lora:true,ipAdapter:true,controlNet:true},
    license:{identifier:"creativeml-openrail-m",commercialUse:"REVIEW_REQUIRED",trainingDerivatives:"REVIEW_REQUIRED",redistribution:"REVIEW_REQUIRED",notes:["Anime/illustration candidate with an SDXL-compatible ecosystem.","OpenRAIL-M restrictions and downstream obligations require review before APPROVED status."],verifiedAt:"2026-09-30",sourceUrl:"https://huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0"},
    productionStatus:"CANDIDATE"
  },
  {
    id:"flux.1-schnell",
    displayName:"FLUX.1 Schnell",
    source:{provider:"HUGGING_FACE",repository:"black-forest-labs/FLUX.1-schnell",revision:"cfac132b798278bc25d0d8a8608dc4522b13c615",artifactChecksum:null},
    architecture:"FLUX",
    capabilities:{textToImage:true,imageToImage:true,inpainting:true,lora:true,ipAdapter:true,controlNet:true},
    license:{identifier:"apache-2.0",commercialUse:true,trainingDerivatives:true,redistribution:true,notes:["General-purpose control candidate rather than anime-specialized baseline.","Official model card explicitly permits personal, scientific, and commercial use.","Artifact checksum is intentionally null because the gated weight was not retrievable during registry research; this blocks APPROVED status."],verifiedAt:"2026-09-30",sourceUrl:"https://huggingface.co/black-forest-labs/FLUX.1-schnell"},
    productionStatus:"CANDIDATE"
  }
] as const;

export class VisualModelRegistry{
  private readonly byId:Map<string,VisualFoundationModel>;
  constructor(models:readonly VisualFoundationModel[]=VISUAL_FOUNDATION_MODELS){
    this.byId=new Map();
    for(const raw of models){
      const model=assertProductionStatus(raw);
      if(!model.source.revision)throw new Error("MODEL_REVISION_REQUIRED");
      if(model.source.provider!=="HUGGING_FACE"&&model.source.provider!=="INTERNAL")throw new Error("UNAPPROVED_MODEL_SOURCE");
      if(this.byId.has(model.id))throw new Error("DUPLICATE_MODEL_ID");
      this.byId.set(model.id,structuredClone(model));
    }
  }
  get(id:string){return this.byId.get(id)??null;}
  list(){return [...this.byId.values()].map(m=>structuredClone(m));}
  approved(){return this.list().filter(m=>m.productionStatus==="APPROVED");}
}
