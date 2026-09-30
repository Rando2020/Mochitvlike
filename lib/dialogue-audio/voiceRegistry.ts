export const OPENAI_VOICES=[
  "marin","cedar","coral","sage","verse","ballad","ash","echo","fable","nova","onyx","shimmer","alloy"
] as const;
export type OpenAIVoiceId=typeof OPENAI_VOICES[number];

export const VOICE_DISPLAY_NAMES:Record<OpenAIVoiceId,string>={
  marin:"Marin",cedar:"Cedar",coral:"Coral",sage:"Sage",verse:"Verse",ballad:"Ballad",ash:"Ash",
  echo:"Echo",fable:"Fable",nova:"Nova",onyx:"Onyx",shimmer:"Shimmer",alloy:"Alloy"
};
