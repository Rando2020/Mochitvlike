import {act,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {buildValidEpisodeTimeline} from "@/lib/episodes/assembly/__tests__/fixtures";
import {EpisodeAssemblyWorkspace} from "./EpisodeAssemblyWorkspace";

describe("EpisodeAssemblyWorkspace",()=>{
 beforeEach(()=>{
   vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
   vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});
 });
 afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
 it("starts on first clip",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getAllByText(/Animated clip|Still hold/).length).toBeGreaterThan(0);});
 it("renders motion video for completed source",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);if(f.episodeTimeline.scenes[0].clips[0].mediaType==="MOTION_VIDEO")expect(document.querySelector("video")).toBeTruthy();});
 it("renders still hold source",()=>{const f=buildValidEpisodeTimeline();const clip=f.episodeTimeline.scenes[0].clips[0];clip.mediaType="STILL_HOLD";clip.asset={...clip.asset,mimeType:"image/png",sourceDurationSeconds:null};render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getByAltText(/Still hold 1/)).toBeInTheDocument();});
 it("toggles play and pause",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);fireEvent.click(screen.getByRole("button",{name:"Play"}));expect(screen.getByRole("button",{name:"Pause"})).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Pause"}));expect(screen.getByRole("button",{name:"Play"})).toBeInTheDocument();});
 it("global clock advances",()=>{vi.useFakeTimers();let now=0;vi.spyOn(performance,"now").mockImplementation(()=>now);const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);fireEvent.click(screen.getByRole("button",{name:"Play"}));now=600;act(()=>vi.advanceTimersByTime(100));expect(Number((screen.getByLabelText("Episode timeline scrubber") as HTMLInputElement).value)).toBeGreaterThan(0);});
 it("scrubber seeks",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);const second=f.episodeTimeline.scenes[0].clips[1];if(second){fireEvent.change(screen.getByLabelText("Episode timeline scrubber"),{target:{value:second.startSeconds+.01}});expect(Number((screen.getByLabelText("Episode timeline scrubber") as HTMLInputElement).value)).toBeGreaterThanOrEqual(second.startSeconds);}});
 it("timeline click seeks",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);const second=f.episodeTimeline.scenes[0].clips[1];if(second){const buttons=screen.getAllByRole("button").filter(b=>b.textContent?.includes(second.storyPurpose));fireEvent.click(buttons[0]);expect(Number((screen.getByLabelText("Episode timeline scrubber") as HTMLInputElement).value)).toBeCloseTo(second.startSeconds,1);}});
 it("dialogue toggle defaults on and can hide",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);const box=screen.getByRole("checkbox",{name:"Show dialogue"});expect(box).toBeChecked();fireEvent.click(box);expect(box).not.toBeChecked();});
 it("shows source type labels",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getAllByText(/Animated clip|Still hold/).length).toBeGreaterThan(0);});
 it("shows coverage panel",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getByText("Visual coverage")).toBeInTheDocument();expect(screen.getByText("Script coverage")).toBeInTheDocument();});
 it("shows assembly warnings",()=>{const f=buildValidEpisodeTimeline();f.episodeTimeline.validation.warnings=["Generated source is 4.0s; using first 3.2s."];render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getByText(/Generated source is 4.0s/)).toBeInTheDocument();});
 it("hides raw JSON and backend internals",()=>{const f=buildValidEpisodeTimeline();const {container}=render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(container.textContent).not.toContain('"scenes":');expect(container.textContent).not.toContain("promptChecksum");expect(container.textContent).not.toContain("provider_task_id");});
 it("keeps Add Voices disabled",()=>{const f=buildValidEpisodeTimeline();render(<EpisodeAssemblyWorkspace timeline={f.episodeTimeline}/>);expect(screen.getByRole("button",{name:"Add Voices"})).toBeDisabled();});
});