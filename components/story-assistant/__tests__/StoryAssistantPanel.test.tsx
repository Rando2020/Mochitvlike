import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryAssistantPanel } from "../StoryAssistantPanel";
import type { StoryAssistantResult, StoryContext } from "@/lib/story-assistant/schema";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
function context(seriesId=A, digest="a".repeat(64)): StoryContext {
  return {
    snapshot: { seriesId, blueprintUpdatedAt: "2026-10-25T08:00:00.000Z", blueprintDigest: "b".repeat(64), seedRevision: 2, seedDigest: "c".repeat(64), digest },
    sources: [
      { id: "canon:rule", kind: "canon", label: "Healing has a cost", content: '{"fact":"Healing drains a memory"}' },
      { id: "seed:finale", kind: "planning", label: "Locked finale seed", content: '{"locked":true,"title":"Orin chooses to remember"}' }
    ],
    selectedBeatIds: [],
    availableBeats: [{ id: "opening", summary: "Orin heals a stranger" }, { id: "reveal", summary: "The cost is revealed" }]
  };
}
function payload(ctx=context(), enabled=true) { return { context: ctx, capability: { enabled, reason: enabled ? "Suggestions available" : "Live generation is disabled until budget and configuration are approved." } }; }
function result(ctx=context()): StoryAssistantResult {
  return { snapshot:ctx.snapshot, suggestions:[{ title:"A costly choice", beat:"Orin trades his happiest memory to save a rival.", whyItFits:"The dark tone makes mercy costly rather than easy.", setup:"Establish what that memory means to him.", consequences:"His rival remembers what he no longer can.", sourceIds:["canon:rule"], alternative:{beat:"Orin refuses, then faces the cost of his choice.",tradeoff:"This protects the memory but delays reconciliation.",sourceIds:["seed:finale"]}}] };
}
function response(body:unknown, status=200) { return {ok:status<400,status,json:async()=>body}; }
function deferred<T>() { let resolve!:(value:T)=>void; const promise=new Promise<T>(r=>{resolve=r;}); return {promise,resolve}; }
async function open() { fireEvent.click(screen.getByRole("button",{name:"Open storytelling assistant"})); await screen.findByLabelText("Your story question"); }
async function ask() { fireEvent.change(screen.getByLabelText("Your story question"),{target:{value:"How can I earn the ending?"}}); fireEvent.click(screen.getByRole("button",{name:"Suggest story beats"})); }
afterEach(()=>vi.unstubAllGlobals());

describe("shared creator storytelling assistant",()=>{
  it("loads only on request and truthfully disables generation while exposing saved planning and canon",async()=>{
    const fetcher=vi.fn().mockResolvedValue(response(payload(context(),false))); vi.stubGlobal("fetch",fetcher);
    render(<StoryAssistantPanel seriesId={A}/>);
    expect(fetcher).not.toHaveBeenCalled(); await open();
    expect(await screen.findByText(/Live generation is disabled/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Suggest story beats"})).toBeDisabled();
    expect(screen.getByText(/Locked seeds are planning intent, not canon/)).toBeInTheDocument();
    expect(screen.getByText("Saved seed revision 2")).toBeInTheDocument();
    expect(screen.getByText("Locked finale seed")).toBeInTheDocument();
    expect(screen.getByText("Established canon")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("distinguishes a known empty saved plan from a failed context load",async()=>{
    const empty=context(); empty.snapshot.seedRevision=0; empty.sources=empty.sources.slice(0,1);
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response(payload(empty,false))));
    const {unmount}=render(<StoryAssistantPanel seriesId={A}/>); await open();
    expect(screen.getByText(/No saved story seeds yet/)).toBeInTheDocument(); unmount();
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response({error:{code:"STORY_STORAGE_UNAVAILABLE",message:"private raw database details"}},503)));
    render(<StoryAssistantPanel seriesId={A}/>); fireEvent.click(screen.getByRole("button",{name:"Open storytelling assistant"}));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load saved story context/i);
    expect(screen.queryByText(/No saved story seeds yet/)).not.toBeInTheDocument();
    expect(screen.queryByText("private raw database details")).not.toBeInTheDocument();
  });
  it("shows excluded unsaved edits and invalidates output when saved revision changes",async()=>{
    const fetcher=vi.fn().mockResolvedValue(response(payload())); vi.stubGlobal("fetch",fetcher);
    const {rerender}=render(<StoryAssistantPanel seriesId={A} hasUnsavedChanges savedSeedRevision={2}/>); await open();
    expect(screen.getByText(/Unsaved edits and new ideas are not included/)).toBeInTheDocument();
    fetcher.mockResolvedValueOnce(response(result())).mockResolvedValueOnce(response(payload())); await ask();
    expect(await screen.findByText("A costly choice")).toBeInTheDocument();
    rerender(<StoryAssistantPanel seriesId={A} hasUnsavedChanges={false} savedSeedRevision={3}/>);
    expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
    await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(4));
  });
  it("revalidates the snapshot before displaying structured suggestions with readable source references",async()=>{
    const verify=deferred<ReturnType<typeof response>>();
    const fetcher=vi.fn().mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response(result())).mockReturnValueOnce(verify.promise); vi.stubGlobal("fetch",fetcher);
    render(<StoryAssistantPanel seriesId={A}/>); await open(); await ask();
    await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(3));
    expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
    await act(async()=>verify.resolve(response(payload())));
    const suggestion=await screen.findByRole("article",{name:"A costly choice"});
    expect(within(suggestion).getByText("Why it fits")).toBeInTheDocument();
    expect(within(suggestion).getByText("Healing has a cost")).toBeInTheDocument();
    expect(within(suggestion).getByText("Locked finale seed")).toBeInTheDocument();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({prompt:"How can I earn the ending?",selectedBeatIds:[],expectedSnapshot:"a".repeat(64)});
  });
  it("rejects a suggestion if the saved context changes during final client verification",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response(result())).mockResolvedValueOnce(response(payload(context(A,"d".repeat(64))))));
    render(<StoryAssistantPanel seriesId={A}/>); await open(); await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed/);
    expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
  });
  it("rejects malformed model output or a foreign citation without displaying its text",async()=>{
    const malformed=result(); malformed.suggestions[0].sourceIds=["other-series:secret"];
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response(malformed)));
    render(<StoryAssistantPanel seriesId={A}/>); await open(); await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not validate/i);
    expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
  });
  it("discards a late A response after series navigation A to B to A and aborts its request",async()=>{
    const late=deferred<ReturnType<typeof response>>();
    const fetcher=vi.fn().mockReturnValueOnce(late.promise).mockResolvedValue(response(payload())); vi.stubGlobal("fetch",fetcher);
    const {rerender}=render(<StoryAssistantPanel seriesId={A}/>); fireEvent.click(screen.getByRole("button",{name:"Open storytelling assistant"}));
    const signal=fetcher.mock.calls[0][1].signal as AbortSignal;
    rerender(<StoryAssistantPanel seriesId={B}/>); rerender(<StoryAssistantPanel seriesId={A}/>); await open();
    const stale=context(); stale.sources[0].label="Old private source";
    await act(async()=>late.resolve(response(payload(stale))));
    expect(signal.aborted).toBe(true); expect(screen.queryByText("Old private source")).not.toBeInTheDocument();
  });
  it("discards late suggestions after dirty state changes and changes back",async()=>{
    const late=deferred<ReturnType<typeof response>>(); const fetcher=vi.fn().mockResolvedValue(response(payload())); vi.stubGlobal("fetch",fetcher);
    const {rerender}=render(<StoryAssistantPanel seriesId={A} hasUnsavedChanges={false}/>); await open();
    fetcher.mockReturnValueOnce(late.promise); await ask();
    const signal=fetcher.mock.calls[1][1].signal as AbortSignal;
    rerender(<StoryAssistantPanel seriesId={A} hasUnsavedChanges/>); rerender(<StoryAssistantPanel seriesId={A} hasUnsavedChanges={false}/>);
    await act(async()=>late.resolve(response(result())));
    expect(signal.aborted).toBe(true); expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
  });
  it("discards in-flight suggestions after the saved bible changes and changes back",async()=>{
    const late=deferred<ReturnType<typeof response>>(); const fetcher=vi.fn().mockResolvedValue(response(payload())); vi.stubGlobal("fetch",fetcher);
    const first="2026-10-25T08:00:00.000Z", next="2026-10-25T08:05:00.000Z";
    const {rerender}=render(<StoryAssistantPanel seriesId={A} savedBlueprintUpdatedAt={first}/>); await open();
    fetcher.mockReturnValueOnce(late.promise); await ask();
    const signal=fetcher.mock.calls[1][1].signal as AbortSignal;
    rerender(<StoryAssistantPanel seriesId={A} savedBlueprintUpdatedAt={next}/>); rerender(<StoryAssistantPanel seriesId={A} savedBlueprintUpdatedAt={first}/>);
    await act(async()=>late.resolve(response(result())));
    expect(signal.aborted).toBe(true); expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
  });
  it("clears displayed suggestions and rejects context older than the saved bible prop",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response(result())).mockResolvedValue(response(payload())); vi.stubGlobal("fetch",fetcher);
    const {rerender}=render(<StoryAssistantPanel seriesId={A} savedBlueprintUpdatedAt="2026-10-25T08:00:00.000Z"/>); await open(); await ask();
    expect(await screen.findByText("A costly choice")).toBeInTheDocument();
    rerender(<StoryAssistantPanel seriesId={A} savedBlueprintUpdatedAt="2026-10-25T08:05:00.000Z"/>);
    expect(screen.queryByText("A costly choice")).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load saved story context/i);
    expect(screen.queryByLabelText("Your story question")).not.toBeInTheDocument();
  });
  it("refreshes context for selected beats and clears displayed suggestions on focus",async()=>{
    const selected=context(); selected.selectedBeatIds=["opening"];
    const fetcher=vi.fn().mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response(payload(selected))).mockResolvedValueOnce(response(result(selected))).mockResolvedValue(response(payload(selected))); vi.stubGlobal("fetch",fetcher);
    render(<StoryAssistantPanel seriesId={A}/>); await open();
    fireEvent.click(screen.getByRole("checkbox",{name:"Orin heals a stranger"}));
    await waitFor(()=>expect(fetcher.mock.calls[1][0]).toContain("beatId=opening"));
    await waitFor(()=>expect(screen.getByRole("checkbox",{name:"Orin heals a stranger"})).toBeChecked());
    await ask(); expect(await screen.findByText("A costly choice")).toBeInTheDocument();
    fireEvent(window,new Event("focus")); expect(screen.queryByText("A costly choice")).not.toBeInTheDocument(); await screen.findByLabelText("Your story question");
  });
});
