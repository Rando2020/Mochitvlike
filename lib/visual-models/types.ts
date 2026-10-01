export type VisualModelProvider="HUGGING_FACE"|"INTERNAL";
export type VisualArchitecture="SDXL"|"SD3"|"FLUX"|"OTHER";
export type ProductionStatus="RESEARCH"|"CANDIDATE"|"APPROVED"|"REJECTED";
export type ReviewablePermission=boolean|"REVIEW_REQUIRED";

export type VisualFoundationModel={
  id:string;
  displayName:string;
  source:{
    provider:VisualModelProvider;
    repository:string;
    revision:string;
    artifactChecksum:string|null;
  };
  architecture:VisualArchitecture;
  capabilities:{
    textToImage:boolean;
    imageToImage:boolean;
    inpainting:boolean;
    lora:boolean;
    ipAdapter:boolean;
    controlNet:boolean;
  };
  license:{
    identifier:string;
    commercialUse:ReviewablePermission;
    trainingDerivatives:ReviewablePermission;
    redistribution:ReviewablePermission;
    notes:string[];
    verifiedAt:string;
    sourceUrl:string;
  };
  productionStatus:ProductionStatus;
};

export type TrainingAssetSource="OWNED"|"COMMISSIONED"|"LICENSED"|"OPT_IN"|"PUBLIC_DOMAIN"|"SYNTHETIC";
export type TrainingAsset={
  id:string;
  source:TrainingAssetSource;
  licenseId:string;
  permissions:{training:boolean;commercial:boolean;redistribution:boolean};
  creatorId:string|null;
  creatorOptIn:boolean;
  checksum:string;
  metadata:{
    characterIds:string[];
    seriesId:string|null;
    shotType:string|null;
    cameraAngle:string|null;
    poseTags:string[];
    styleTags:string[];
    lightingTags:string[];
    emotionTags:string[];
  };
};
