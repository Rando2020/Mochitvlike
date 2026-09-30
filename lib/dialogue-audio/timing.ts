import type {DialogueTimingFit} from "./types";
export function classifyDialogueTiming(naturalDurationSeconds:number,visualWindowSeconds:number):{fit:DialogueTimingFit;differenceSeconds:number}{
  const difference=naturalDurationSeconds-visualWindowSeconds;
  if(naturalDurationSeconds<visualWindowSeconds*.55)return{fit:"VERY_SHORT",differenceSeconds:difference};
  if(difference>.25)return{fit:"TOO_LONG",differenceSeconds:difference};
  return{fit:"FITS",differenceSeconds:difference};
}
