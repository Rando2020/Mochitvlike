import type {MotionQualityResult,MotionQualityValidator} from "./types";

export class TechnicalMotionQualityValidator implements MotionQualityValidator{
  async validate({video,expectedDurationSeconds}:Parameters<MotionQualityValidator["validate"]>[0]):Promise<MotionQualityResult>{
    const checks:string[]=[];
    if(video.mimeType!=="video/mp4")return{ok:false,code:"MOTION_QUALITY_FAILED",checks:["Unexpected video MIME type."]};
    checks.push("video/mp4 output");
    if(video.bytes.byteLength<1024)return{ok:false,code:"MOTION_QUALITY_FAILED",checks:[...checks,"Video payload too small."]};
    checks.push("non-empty video payload");
    if(video.width!==1280||video.height!==720)return{ok:false,code:"MOTION_QUALITY_FAILED",checks:[...checks,"Unexpected output dimensions."]};
    checks.push("1280x720 output");
    if(video.durationSeconds<=0)return{ok:false,code:"MOTION_QUALITY_FAILED",checks:[...checks,"Invalid duration metadata."]};
    checks.push("positive provider duration");
    if(expectedDurationSeconds<=0)return{ok:false,code:"MOTION_QUALITY_FAILED",checks:[...checks,"Invalid Animatic target duration."]};
    checks.push("Animatic target preserved separately");
    return{ok:true,code:null,checks};
  }
}

export function createMotionQualityValidator():MotionQualityValidator{return new TechnicalMotionQualityValidator();}
