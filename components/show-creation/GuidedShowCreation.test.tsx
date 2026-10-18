import { EMPTY_CHARACTER_DIRECTION } from "@/lib/character-direction/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { GuidedShowCreation } from "./GuidedShowCreation";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
const direction=structuredClone(theWoundsWeKeep);
direction.season.format.episodeLengthSeconds=60;
const result={seriesBlueprint:direction,metadata:{source:"llm",schemaVersion:"1.0"}};
const idea="A healer carries the wounds of others.";
const show=()=>render(<GuidedShowCreation creatorId="owner" providerReady={true} />);
async function generate(){fireEvent.change(screen.getByLabelText("Describe your show"),{target:{value:idea}});fireEvent.click(screen.getByRole("button",{name:"Explore this show"}));await screen.findByRole("button",{name:"Save and open Studio"});}
beforeEach(()=>{sessionStorage.clear();vi.clearAllMocks();});afterEach(()=>vi.restoreAllMocks());
describe("guided creation",()=>{
  it("bounds personality choices and preserves tag selections after failure and refresh",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("{}",{status:503}));
    const view=show();
    fireEvent.click(screen.getByText("Main character direction · optional"));
    for(const trait of ["Compassionate","Guarded","Analytical"])fireEvent.click(screen.getByRole("checkbox",{name:trait}));
    expect(screen.getByRole("checkbox",{name:"Playful"})).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Body build"),{target:{value:"athletic"}});
    fireEvent.change(screen.getByLabelText("Voice texture"),{target:{value:"warm"}});
    fireEvent.change(screen.getByLabelText("Describe your show"),{target:{value:idea}});
    fireEvent.click(screen.getByRole("button",{name:"Explore this show"}));
    await screen.findByRole("alert");
    await waitFor(()=>expect(sessionStorage.getItem("show-creation-v1:owner")).toContain('"body":"athletic"'));
    view.unmount();show();
    fireEvent.click(screen.getByText("Main character direction · optional"));
    expect(screen.getByLabelText("Body build")).toHaveValue("athletic");
    expect(screen.getByRole("checkbox",{name:"Guarded"})).toBeChecked();
    expect(screen.getByLabelText("Voice texture")).toHaveValue("warm");
  });
  it("sends explicit direction, reviews it, and saves the same character tags",async()=>{
    const tags={...EMPTY_CHARACTER_DIRECTION,body:"athletic" as const,voiceDelivery:"calm" as const};
    const tagged=structuredClone(result);tagged.seriesBlueprint.cast[0].generationDirection=tags;
    const fetcher=vi.spyOn(globalThis,"fetch").mockImplementation(async(url,options)=>{
      if(url==="/api/series/generate")return new Response(JSON.stringify(tagged));
      const body=JSON.parse(String(options?.body));
      expect(body.seriesBlueprint.cast[0].generationDirection).toEqual(tags);
      return new Response(JSON.stringify({series:{id:body.creationId}}));
    });
    show();fireEvent.click(screen.getByText("Main character direction · optional"));
    fireEvent.change(screen.getByLabelText("Body build"),{target:{value:"athletic"}});
    fireEvent.change(screen.getByLabelText("Voice delivery"),{target:{value:"calm"}});
    await generate();
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).protagonistDirection).toEqual(tags);
    expect(screen.getByText("Athletic")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Save and open Studio"}));
    await screen.findByRole("link",{name:"Open saved Studio"});
  });
  it("rejects a direction response that loses selected character tags",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    show();fireEvent.click(screen.getByText("Main character direction · optional"));
    fireEvent.change(screen.getByLabelText("Body build"),{target:{value:"athletic"}});
    fireEvent.change(screen.getByLabelText("Describe your show"),{target:{value:idea}});
    fireEvent.click(screen.getByRole("button",{name:"Explore this show"}));
    await screen.findByRole("alert");
    expect(screen.queryByRole("button",{name:"Save and open Studio"})).not.toBeInTheDocument();
    expect(screen.getByLabelText("Body build")).toHaveValue("athletic");
  });
  it("offers sign-in rather than a fake working generation action",()=>{
    render(<GuidedShowCreation creatorId={null} providerReady={true} />);
    expect(screen.getByRole("button",{name:"Explore this show"})).toBeDisabled();
    expect(screen.getByRole("link",{name:"Open sign-in"})).toHaveAttribute("href","/login");
  });
  it("reviews direction before saving and can revise without a save",async()=>{
    const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    show();await generate();
    expect(screen.getByText("Your starting direction · not saved yet")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button",{name:"Revise my idea"}));
    expect(screen.getByLabelText("Describe your show")).toHaveValue(idea);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves the idea after provider failure",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("{}",{status:503}));
    show();fireEvent.change(screen.getByLabelText("Describe your show"),{target:{value:idea}});fireEvent.click(screen.getByRole("button",{name:"Explore this show"}));
    await screen.findByRole("alert");expect(screen.getByLabelText("Describe your show")).toHaveValue(idea);
  });
  it("prevents repeated clicks while developing",async()=>{
    let finish!:(r:Response)=>void;
    const fetcher=vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    show();fireEvent.change(screen.getByLabelText("Describe your show"),{target:{value:idea}});
    const button=screen.getByRole("button",{name:"Explore this show"});fireEvent.click(button);fireEvent.click(button);expect(fetcher).toHaveBeenCalledTimes(1);
    finish(new Response(JSON.stringify(result)));await screen.findByRole("button",{name:"Save and open Studio"});
  });
  it("reuses the same creation ID after an uncertain save, then routes to the confirmed series",async()=>{
    let tries=0;const ids:string[]=[];
    vi.spyOn(globalThis,"fetch").mockImplementation(async(url,options)=>{
      if(url==="/api/series/generate")return new Response(JSON.stringify(result));
      const body=JSON.parse(String(options?.body));ids.push(body.creationId);tries++;
      if(tries===1)throw new Error("lost response");
      return new Response(JSON.stringify({series:{id:body.creationId,title:"Saved",status:"DRAFT",createdAt:"now"}}));
    });
    show();await generate();fireEvent.click(screen.getByRole("button",{name:"Save and open Studio"}));await screen.findByRole("alert");
    expect(screen.getByRole("button",{name:"Save and open Studio"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button",{name:"Save and open Studio"}));await screen.findByRole("link",{name:"Open saved Studio"});
    expect(ids[0]).toBe(ids[1]);expect(useRouter().push).toHaveBeenCalledWith(`/series/${ids[1]}`);
  });
  it("recovers the direction after reload without regenerating",async()=>{
    const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    const view=show();await generate();await waitFor(()=>expect(sessionStorage.getItem("show-creation-v1:owner")).toContain("seriesBlueprint"));view.unmount();show();
    await screen.findByRole("button",{name:"Save and open Studio"});expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not recover another account's draft",()=>{
    sessionStorage.setItem("show-creation-v1:other",JSON.stringify({idea,generated:result}));show();expect(screen.getByLabelText("Describe your show")).toHaveValue("");
  });
  it("shows saved shows even when generation is disconnected",()=>{
    render(<GuidedShowCreation creatorId="owner" providerReady={false} series={[{id:"series",title:"My show",logline:"A mystery",status:"DRAFT",genres:["MYSTERY"],updatedAt:"now"}]} />);
    expect(screen.getByRole("button",{name:"Explore this show"})).toBeDisabled();expect(screen.getByRole("link",{name:/My show/})).toHaveAttribute("href","/series/series");
  });
  it("clears recovered state when the authenticated account changes",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    const view=show();await generate();
    view.rerender(<GuidedShowCreation creatorId="different-owner" providerReady={true} />);
    await waitFor(()=>expect(screen.getByLabelText("Describe your show")).toHaveValue(""));
    expect(sessionStorage.getItem("show-creation-v1:different-owner")).not.toContain("The Wounds We Keep");
  });
  it("rejects a malformed save receipt without navigating",async()=>{
    const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    show();await generate();fetcher.mockResolvedValue(new Response(JSON.stringify({series:{id:"../../other"}})));
    fireEvent.click(screen.getByRole("button",{name:"Save and open Studio"}));await screen.findByRole("alert");
    expect(useRouter().push).not.toHaveBeenCalled();
  });

});
