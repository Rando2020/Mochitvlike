import {fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
import {buildValidDialogue} from "@/lib/dialogue-audio/__tests__/fixtures";
import {DialogueAudioWorkspace} from "./DialogueAudioWorkspace";

function ready(){
 const f=buildValidDialogue();const plan=structuredClone(f.plan);
 plan.lines.forEach((l,i)=>{l.generationStatus="COMPLETED";l.audioAsset={url:"https://example.com/"+i+".wav",storagePath:i+".wav",mimeType:"audio/wav",durationSeconds:l.visualWindowSeconds+.5,sampleRate:24000,channels:1};l.timing={naturalDurationSeconds:l.visualWindowSeconds+.5,differenceSeconds:.5,fit:"TOO_LONG"};});
 return{...f,plan};
}
const props={statusEndpoint:"/s",retryBase:"/s",soundBase:"/s"};
describe("DialogueAudioWorkspace",()=>{
 beforeEach(()=>{vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});});
 afterEach(()=>vi.restoreAllMocks());
 it("shows AI voice disclosure",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByText(/AI-generated character voices/i)).toBeInTheDocument();});
 it("renders voice cast strip",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByText("Voice Cast")).toBeInTheDocument();expect(screen.getAllByRole("button",{name:"Play sample"}).length).toBe(f.voiceCast.assignments.length);});
 it("renders exact dialogue lines",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByText(f.plan.lines[0].text)).toBeInTheDocument();});
 it("shows runs-long warning",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(screen.getAllByText(/Runs 0.5s long/).length).toBeGreaterThan(0);});
 it("plays and pauses Episode",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);fireEvent.click(screen.getByRole("button",{name:"Play Episode"}));expect(screen.getByRole("button",{name:"Pause"})).toBeInTheDocument();});
 it("mutes dialogue without changing Episode timing",()=>{const f=ready(),duration=f.episodeTimeline.targetDurationSeconds;render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);fireEvent.click(screen.getByRole("button",{name:"Mute dialogue"}));expect(screen.getByRole("button",{name:"Unmute dialogue"})).toBeInTheDocument();expect(f.episodeTimeline.targetDurationSeconds).toBe(duration);});
 it("seeks with Episode-global scrubber",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);fireEvent.change(screen.getByLabelText("Dialogue episode scrubber"),{target:{value:1}});expect((screen.getByLabelText("Dialogue episode scrubber") as HTMLInputElement).value).toBe("1");});
 it("renders retry for failed line",()=>{const f=ready();f.plan.lines[0].generationStatus="FAILED";f.plan.lines[0].audioAsset=null;render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="PARTIAL" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByRole("button",{name:"Retry failed line"})).toBeInTheDocument();});
 it("enables Add Sound when dialogue is ready",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByRole("button",{name:"Add Sound"})).toBeEnabled();});
 it("disables Add Sound while dialogue is generating",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="GENERATING" voiceCast={f.voiceCast} {...props}/>);expect(screen.getByRole("button",{name:"Add Sound"})).toBeDisabled();});
 it("shows Open Sound when a plan exists",()=>{const f=ready();render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props} latestSound={{id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"}}/>);expect(screen.getByRole("button",{name:"Open Sound"})).toBeEnabled();});
 it("does not expose provider queue internals",()=>{const f=ready();const {container}=render(<DialogueAudioWorkspace timeline={f.episodeTimeline} initialPlan={f.plan} initialStatus="READY" voiceCast={f.voiceCast} {...props}/>);expect(container.textContent).not.toMatch(/claim_token|lease_expires_at|OPENAI_API_KEY|ELEVENLABS_API_KEY/);});
});