import {describe,expect,it} from "vitest";
import {createAnimaticPreviewRenderer} from "../previewRenderer";
import {buildValidAnimatic} from "./fixtures";
describe("AnimaticPreviewRenderer",()=>{
 it("uses safe browser-playback fallback",async()=>{const f=buildValidAnimatic();await expect(createAnimaticPreviewRenderer().render(f.timeline)).rejects.toThrow("ANIMATIC_PREVIEW_RENDERER_NOT_CONFIGURED");});
 it("does not generate media implicitly",()=>expect(createAnimaticPreviewRenderer().constructor.name).toBe("BrowserPlaybackOnlyRenderer"));
});
