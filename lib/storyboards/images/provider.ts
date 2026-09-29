import OpenAI from "openai";
export type GeneratedStoryboardImage={bytes:Uint8Array;mimeType:"image/png";width:number;height:number;provider:string;model:string};
export interface StoryboardImageProvider{readonly name:string;readonly model:string;generate(input:{prompt:string;negativeConstraints:string[];width:number;height:number;signal?:AbortSignal}):Promise<GeneratedStoryboardImage>;}
export class OpenAIStoryboardImageProvider implements StoryboardImageProvider{
  readonly name="openai";
  readonly model=process.env.OPENAI_STORYBOARD_IMAGE_MODEL??"gpt-image-2";
  private client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  async generate(input:{prompt:string;negativeConstraints:string[];width:number;height:number;signal?:AbortSignal}){
    const response=await this.client.images.generate({
      model:this.model,prompt:input.prompt,n:1,size:"1536x1024",quality:"medium",output_format:"png"
    } as never,{signal:input.signal});
    const encoded=response.data?.[0]?.b64_json;
    if(!encoded)throw new Error("STORYBOARD_PROVIDER_MALFORMED");
    return{bytes:new Uint8Array(Buffer.from(encoded,"base64")),mimeType:"image/png" as const,width:1536,height:1024,provider:this.name,model:this.model};
  }
}
