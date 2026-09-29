import {act,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
import {buildValidEpisodeTimeline} from "@/lib/episodes/assembly/__tests__/fixtures";
import {EpisodeAssemblyWorkspace} from "./EpisodeAssemblyWorkspace";
const base="/api/series/s/episodes/episodeOne/assemblies/a";

describe("EpisodeAssemblyWorkspace",()=>{
 beforeEach(()=>{vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});});
 afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
 const view=()=>{const f=buildValidEpisodeTimeline();return{f,...render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline} dialogueBase={base}/>)}};
 it("starts on first clip",()=>{view();expect(screen.getAllByText(/Animated clip|Still hold/).length).toBeGreaterThan(0);});
 it("renders motion video for completed source",()=>{const {f}=view();if(f.episodeTimeline.scenes[0].clips[0].mediaType==="MOTION_VIDEO")expect(document.querySelector("video")).toBeTruthy();});
 it("toggles play and pause",()=>{view();fireEvent.click(screen.getByRole("button",{name:"Play"}));expect(screen.getByRole("button",{name:"Pause"})).toBeInTheDocument();});
 it("global clock advances",()=>{vi.useFakeTimers();let now=0;vi.spyOn(performance,"now").mockImplementation(()=>now);view();fireEvent.click(screen.getByRole("button",{name:"Play"}));now=600;act(()=>vi.advanceTimersByTime(100));expect(Number((screen.getByLabelText("Episode timeline scrubber") as HTMLInputElement).value)).toBeGreaterThan(0);});
 it("scrubber seeks",()=>{const {f}=view();const second=f.episodeTimeline.scenes[0].clips[1];if(second){fireEvent.change(screen.getByLabelText("Episode timeline scrubber"),{target:{value:second.startSeconds+.01}});expect(Number((screen.getByLabelText("Episode timeline scrubber") as HTMLInputElement).value)).toBeGreaterThanOrEqual(second.startSeconds);}});
 it("dialogue toggle defaults on",()=>{view();expect(screen.getByRole("checkbox",{name:"Show dialogue"})).toBeChecked();});
 it("shows coverage panel",()=>{view();expect(screen.getByText("Visual coverage")).toBeInTheDocument();});
 it("enables Add Voices when dialogue exists",()=>{view();expect(screen.getByRole("button",{name:"Add Voices"})).toBeEnabled();});
 it("disables Add Voices when no dialogue exists",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.scenes.forEach(s=>s.clips.forEach(c=>c.dialogueCues=[]));render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline} dialogueBase={base}/>);expect(screen.getByRole("button",{name:"Add Voices"})).toBeDisabled();});
 it("shows Open Voices when dialogue plan exists",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline} dialogueBase={base} latestDialogue={{id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}}/>);expect(screen.getByRole("button",{name:"Open Voices"})).toBeEnabled();});
 it("hides raw backend internals",()=>{const {container}=view();expect(container.textContent).not.toContain("claim_token");expect(container.textContent).not.toContain("provider_task_id");});
});
