import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeriesStudio } from "@/components/series-studio/SeriesStudio";
import { StorySeedsWorkspace } from "@/components/creator-preview/StorySeedsWorkspace";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const plan={revision:0,seeds:[],updatedAt:null};
function reply(body:unknown){return {ok:true,json:async()=>body};}
afterEach(()=>vi.unstubAllGlobals());
describe("Storytelling assistant Studio integration",()=>{
  it("offers the same creator-only assistant in owned Studio but not the demo",()=>{
    const {rerender}=render(<SeriesStudio seriesId={A} blueprint={theWoundsWeKeep}/>);
    expect(screen.getByRole("button",{name:"Open storytelling assistant"})).toBeInTheDocument();
    rerender(<SeriesStudio seriesId="demo" blueprint={theWoundsWeKeep}/>);
    expect(screen.queryByRole("button",{name:"Open storytelling assistant"})).not.toBeInTheDocument();
  });
  it("marks unadded seed ideas as excluded without sending them to the assistant",async()=>{
    const fetcher=vi.fn().mockResolvedValue(reply({plan})); vi.stubGlobal("fetch",fetcher);
    render(<StorySeedsWorkspace seriesId={A} blueprint={theWoundsWeKeep}/>);
    expect(await screen.findByRole("button",{name:"Open storytelling assistant"})).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Describe your moment"),{target:{value:"An unsaved secret ending"}});
    expect(screen.getByText(/Unsaved edits and new ideas are not included/)).toBeInTheDocument(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not carry a seed draft across series navigation",async()=>{
    let resolve!:(value:ReturnType<typeof reply>)=>void;
    const late=new Promise<ReturnType<typeof reply>>(r=>{resolve=r;});
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(reply({plan})).mockReturnValueOnce(late));
    const {rerender}=render(<StorySeedsWorkspace seriesId={A} blueprint={theWoundsWeKeep}/>);
    await screen.findByLabelText("Describe your moment");
    fireEvent.change(screen.getByLabelText("Describe your moment"),{target:{value:"Private draft in series A"}});
    rerender(<StorySeedsWorkspace seriesId={B} blueprint={theWoundsWeKeep}/>);
    expect(screen.queryByDisplayValue("Private draft in series A")).not.toBeInTheDocument();
    expect(screen.queryByText("Your story plan is up to date")).not.toBeInTheDocument();
    await act(async()=>resolve(reply({plan}))); expect(await screen.findByLabelText("Describe your moment")).toHaveValue("");
  });
});
