import type {AnimaticPreviewRenderer,AnimaticTimeline} from "./types";

export class BrowserPlaybackOnlyRenderer implements AnimaticPreviewRenderer{
  async render(_timeline:AnimaticTimeline):Promise<{url:string;storagePath:string;mimeType:string}>{
    throw new Error("ANIMATIC_PREVIEW_RENDERER_NOT_CONFIGURED");
  }
}

export function createAnimaticPreviewRenderer():AnimaticPreviewRenderer{
  return new BrowserPlaybackOnlyRenderer();
}
