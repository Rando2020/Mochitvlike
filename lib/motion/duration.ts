export const RUNWAY_GEN45_MIN_SECONDS=2;
export const RUNWAY_GEN45_MAX_SECONDS=10;

export function mapTargetToRunwayDuration(targetDurationSeconds:number){
  if(!Number.isFinite(targetDurationSeconds)||targetDurationSeconds<=0)throw new Error("INVALID_TARGET_DURATION");
  return Math.min(RUNWAY_GEN45_MAX_SECONDS,Math.max(RUNWAY_GEN45_MIN_SECONDS,Math.ceil(targetDurationSeconds)));
}
