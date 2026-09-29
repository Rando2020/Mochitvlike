import type {EpisodePreviewRenderer,EpisodeTimeline} from "./types";
export class BrowserEpisodePlaybackRenderer implements EpisodePreviewRenderer{
  async render(_timeline:EpisodeTimeline):Promise<{url:string;storagePath:string;mimeType:string}>{
    throw new Error("EPISODE_PREVIEW_RENDERER_NOT_CONFIGURED");
  }
}
export function createEpisodePreviewRenderer():EpisodePreviewRenderer{return new BrowserEpisodePlaybackRenderer();}
