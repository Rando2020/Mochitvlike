import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReferenceBindingEditor } from "./ReferenceBindingEditor";
import { EMPTY_CHARACTER_DIRECTION } from "@/lib/character-direction/schema";
const candidate={id:"11111111-1111-4111-8111-111111111111",version:2,checksum:"b".repeat(64),role:"FULL_BODY" as const,width:100,height:200};
const review={expectedRevision:"a".repeat(64),visualRevision:"b".repeat(64),impactRevision:"c".repeat(64),reviewId:"d".repeat(64),characterName:"Mara",direction:{...EMPTY_CHARACTER_DIRECTION,body:"athletic"},reference:candidate,currentReferenceId:null,impact:[{label:"Production frames",count:3}],previewUrl:"https://private.example/ref.png"};
const show=(archived=false,empty=false)=>render(<ReferenceBindingEditor seriesId="show" characterId="char_mara" name="Mara" description="A guard in traveling clothes" candidates={empty?[]:[candidate]} visualRevision={review.visualRevision} currentReferenceId={null} archived={archived}/>);
async function preview(){fireEvent.click(screen.getByRole("button",{name:"Preview binding and impact"}));await screen.findByRole("heading",{name:"Review proposed identity binding"});}
async function acknowledge(){fireEvent.load(screen.getByRole("img"));await waitFor(()=>expect(screen.getByRole("checkbox",{name:/I inspected/})).toBeEnabled());fireEvent.click(screen.getByRole("checkbox",{name:/I inspected/}));}
beforeEach(()=>vi.clearAllMocks());afterEach(()=>vi.restoreAllMocks());
describe("Reference identity binding UX",()=>{
 it("requires loaded image review, shows binding and impact, and explicitly approves",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({review}))).mockResolvedValueOnce(new Response(JSON.stringify({approved:true})));
  show();await preview();expect(fetcher).toHaveBeenCalledTimes(1);expect(screen.getByText("Production frames: 3")).toBeInTheDocument();
  expect(screen.getByRole("checkbox",{name:/I inspected/})).toBeDisabled();expect(screen.getByRole("button",{name:"Approve identity binding"})).toBeDisabled();
  await acknowledge();fireEvent.click(screen.getByRole("button",{name:"Approve identity binding"}));await screen.findByRole("heading",{name:"Reference binding approved"});
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({action:"approve",referenceId:candidate.id,expectedRevision:review.expectedRevision,visualRevision:review.visualRevision,impactRevision:review.impactRevision,reviewId:review.reviewId,acknowledgeIdentity:true});
 });
 it("rejects stale review, keeps selection and requires a fresh preview",async()=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({review}))).mockResolvedValueOnce(new Response(JSON.stringify({error:{message:"Another editor changed this show"}}),{status:409}));
  show();await preview();await acknowledge();fireEvent.click(screen.getByRole("button",{name:"Approve identity binding"}));await screen.findByRole("alert");
  expect(screen.getByLabelText("Approved identity reference")).toHaveValue(candidate.id);expect(screen.queryByRole("button",{name:"Approve identity binding"})).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Preview binding and impact"})).toBeEnabled();
 });
 it("retries uncertain approvals without changing the request or allowing selection edits",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({review}))).mockRejectedValueOnce(new Error("Network interrupted")).mockResolvedValueOnce(new Response(JSON.stringify({approved:true})));
  show();await preview();await acknowledge();fireEvent.click(screen.getByRole("button",{name:"Approve identity binding"}));await screen.findByRole("alert");
  expect(screen.getByRole("button",{name:"Back to selection"})).toBeDisabled();fireEvent.error(screen.getByRole("img"));
  fireEvent.click(screen.getByRole("button",{name:"Retry reviewed approval"}));await screen.findByRole("heading",{name:"Reference binding approved"});
  expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[2][1]?.body);
 });
 it("failed image preview prevents approval and back to selection makes no write",async()=>{
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({review})));show();await preview();
  fireEvent.error(screen.getByRole("img"));expect(screen.getByRole("button",{name:"Approve identity binding"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Back to selection"}));expect(fetcher).toHaveBeenCalledTimes(1);expect(screen.getByRole("button",{name:"Preview binding and impact"})).toBeInTheDocument();
 });
 it("archived and empty states cannot approve",()=>{
  const view=show(true);expect(screen.getByRole("button",{name:"Preview binding and impact"})).toBeDisabled();view.unmount();show(false,true);
  expect(screen.getByRole("button",{name:"Preview binding and impact"})).toBeDisabled();expect(screen.getByRole("link",{name:"Reference Studio"})).toHaveAttribute("href","/series/show/references");
 });
});
