import {VisualModelRegistry} from "@/lib/visual-models/registry";
import type {VisualFoundationModel} from "@/lib/visual-models/types";

export class VisualModelSelectionError extends Error{
 constructor(public readonly code:"NO_APPROVED_VISUAL_MODEL"|"VISUAL_DEV_MODEL_NOT_FOUND"|"VISUAL_DEV_MODEL_FORBIDDEN",message:string){super(message);}
}
export type SelectedVisualModel={model:VisualFoundationModel;developmentOverride:boolean};

export function selectVisualProductionModel(input:{registry?:VisualModelRegistry;nodeEnv?:string;devModelId?:string|null}={}):SelectedVisualModel{
 const registry=input.registry??new VisualModelRegistry();
 const approved=registry.approved()[0];
 if(approved)return{model:approved,developmentOverride:false};
 const nodeEnv=input.nodeEnv??process.env.NODE_ENV;
 const devModelId=input.devModelId??process.env.VISUAL_DEV_MODEL_ID??null;
 if(!devModelId)throw new VisualModelSelectionError("NO_APPROVED_VISUAL_MODEL","No approved visual production model is configured.");
 if(nodeEnv==="production")throw new VisualModelSelectionError("VISUAL_DEV_MODEL_FORBIDDEN","Development visual model overrides are disabled in production.");
 const model=registry.get(devModelId);
 if(!model)throw new VisualModelSelectionError("VISUAL_DEV_MODEL_NOT_FOUND","Development visual model was not found in the registry.");
 return{model,developmentOverride:true};
}
