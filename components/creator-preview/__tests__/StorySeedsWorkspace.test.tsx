import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { StorySeedsWorkspace } from "../StorySeedsWorkspace";

const uuid = "11111111-1111-4111-8111-111111111111";
const plan = { revision: 0, seeds: [], updatedAt: null };
afterEach(() => vi.unstubAllGlobals());
function reply(value: unknown, status=200) { return { ok: status < 400, status, json: async () => value }; }
describe("owned Story Architect", () => {
  it("loads, edits and explicitly saves one story seed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply({plan}))
      .mockResolvedValueOnce(reply({plan:{revision:1,seeds:[{id:uuid,title:"The mentor's secret",type:"EVENT",placement:"UNPLACED",characterId:"char_orin",locked:false,setup:"",consequence:"",payoff:""}],updatedAt:"now"}}));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => uuid });
    render(<StorySeedsWorkspace seriesId="22222222-2222-4222-8222-222222222222" blueprint={theWoundsWeKeep}/>);
    expect(await screen.findByText("Your story starts with one turning point.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Describe your moment"), { target: { value: "The mentor's secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Add to draft/i }));
    expect(screen.getByText("The mentor's secret")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save story plan" }));
    await waitFor(() => expect(screen.getByText(/Story seeds saved/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({expectedRevision:0,requestId:uuid});
  });
  it("does not erase a draft on revision conflict", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply({plan}))
      .mockResolvedValueOnce(reply({error:{code:"STORY_REVISION_CONFLICT"}},409));
    vi.stubGlobal("fetch",fetchMock);
    vi.stubGlobal("crypto", {randomUUID: () => uuid});
    render(<StorySeedsWorkspace seriesId={uuid} blueprint={theWoundsWeKeep}/>);
    await screen.findByText("Your story starts with one turning point.");
    fireEvent.change(screen.getByLabelText("Describe your moment"),{target:{value:"A very important ending"}});
    fireEvent.click(screen.getByRole("button",{name:/Add to draft/i}));
    fireEvent.click(screen.getByRole("button",{name:"Save story plan"}));
    expect(await screen.findByRole("alert")).toHaveTextContent(/draft is still here/i);
    expect(screen.getByText("A very important ending")).toBeInTheDocument();
  });
});
