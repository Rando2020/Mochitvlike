import type {TrainingAsset,VisualFoundationModel} from "./types";

export function canApproveForProduction(model:VisualFoundationModel){
  return model.source.provider!=="HUGGING_FACE"||(
    model.source.revision.length>=7&&
    !!model.source.artifactChecksum&&
    model.license.commercialUse===true
  );
}

export function assertProductionStatus(model:VisualFoundationModel){
  if(model.productionStatus==="APPROVED"&&!canApproveForProduction(model)){
    throw new Error("MODEL_NOT_ELIGIBLE_FOR_APPROVAL");
  }
  return model;
}

export function isTrainingEligible(asset:TrainingAsset){
  if(!asset.permissions.training||!asset.permissions.commercial)return false;
  if(asset.source==="OPT_IN"&&!asset.creatorOptIn)return false;
  if(asset.creatorId&&!asset.creatorOptIn&&asset.source!=="OWNED"&&asset.source!=="COMMISSIONED"&&asset.source!=="LICENSED")return false;
  return true;
}
