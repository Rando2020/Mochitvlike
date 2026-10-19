import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { theWoundsWeKeep as blueprint } from "@/lib/series/demoBlueprint";
import type { SceneSummary } from "@/lib/scenes/types";
import { EpisodeBoard } from "./EpisodeBoard";
import { SeriesDrawer } from "./SeriesDrawer";
import { SeriesStudio } from "./SeriesStudio";

const seriesId = "22222222-2222-4222-8222-222222222222";
const sceneId = "11111111-1111-4111-8111-111111111111";
const scene = (beat: string, status: SceneSummary["status"] = "DRAFT"): SceneSummary => ({
  id: sceneId, sourceBeatId: beat, title: "Saved title", status, updatedAt: "2026-10-04T00:00:00Z"
});
const episode = () => fireEvent.click(screen.getAllByRole("button", { name: "Episode" })[0]);

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("planning board", () => {
  it("preserves beat order, shows canonical context and selects only current active plans", () => {
    const old = { ...scene("beat_1", "READY"), title: "Old title", updatedAt: "2026-10-01T00:00:00Z" };
    render(<EpisodeBoard blueprint={blueprint} scenes={[scene("unknown"), old, scene("beat_2", "ARCHIVED"), scene("beat_1")]} pending={false} preview={false} onScene={vi.fn()} />);
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(blueprint.episodeOne.beats.length);
    blueprint.episodeOne.beats.forEach((beat, index) => {
      expect(cards[index]).toHaveTextContent(beat.summary);
      expect(cards[index]).toHaveTextContent(beat.storyChange);
    });
    expect(screen.getByText(/1 \/ .*scene plans saved/)).toHaveTextContent("0 ready plans");
    expect(screen.queryByText("Old title")).not.toBeInTheDocument();
    expect(within(cards[0]).getByText("Draft plan")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Not planned")).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("Orin");
  });
  it("labels ready as a plan and handles missing cast and location", () => {
    const changed = structuredClone(blueprint);
    changed.episodeOne.beats[0].involvedCharacterIds = [];
    changed.episodeOne.beats[0].locationId = null;
    render(<EpisodeBoard blueprint={changed} scenes={[scene("beat_1", "READY")]} pending={false} preview={false} onScene={vi.fn()} />);
    expect(screen.getByText("Ready plan")).toBeInTheDocument();
    expect(screen.getByText("No cast assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Location not set").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /render|preview|export/i })).not.toBeInTheDocument();
  });
  it("opens the saved scene from the board without generation", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} sceneSummaries={[scene("beat_1")]} />);
    episode();
    fireEvent.click(screen.getByRole("button", { name: "Open scene plan 1" }));
    expect(useRouter().push).toHaveBeenCalledWith(`/series/${seriesId}/scenes/${sceneId}`);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requests the selected missing beat once, shares pending state, and opens the returned scene", async () => {
    let resolve!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    episode();
    fireEvent.click(screen.getByRole("button", { name: "Develop scene plan 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Develop scene plan 1" }));
    expect(screen.getByRole("button", { name: "Develop scene plan 1" })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(`/api/series/${seriesId}/scenes/generate`, expect.objectContaining({ body: JSON.stringify({ episodeKey: "episodeOne", beatId: "beat_2" }) }));
    resolve(new Response(JSON.stringify({ scene: { id: sceneId } })));
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith(`/series/${seriesId}/scenes/${sceneId}`));
  });
  it("retains the board after a failed request and enables retry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    episode();
    fireEvent.click(screen.getByRole("button", { name: "Develop scene plan 2" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Develop scene plan 2" })).toBeEnabled();
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
  });
  it("keeps example board read only", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(<SeriesStudio blueprint={blueprint} seriesId="demo" />);
    episode();
    expect(screen.queryByRole("button", { name: /Develop scene plan/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Preview only")).toHaveLength(blueprint.episodeOne.beats.length);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("read-only series drawer", () => {
  const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
  beforeAll(() => {
    if (!originalShow) Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, writable: true, value() {} });
    if (!originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, writable: true, value() {} });
  });
  afterAll(() => {
    if (!originalShow) Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (!originalClose) Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });
  beforeEach(() => {
    // JSDOM lacks the browser's modal/inert/focus algorithm. Test lifecycle here,
    // and leave native focus containment and responsive geometry to browser review.
    vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (this: HTMLDialogElement) { this.open = true; this.querySelector<HTMLButtonElement>("button")?.focus(); });
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) { this.open = false; });
  });
  it("opens from the episode board, locks scroll, and restores focus on close", () => {
    document.body.style.overflow = "auto";
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    episode();
    const opener = screen.getByRole("button", { name: "Your series" });
    opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(blueprint.identity.title);
    expect(within(dialog).getByRole("heading", { name: "Cast" })).toBeInTheDocument();
    expect(within(dialog).getByText(blueprint.creativeDNA.visualStyle.description)).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close your series" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
    expect(opener).toHaveFocus();
    document.body.style.overflow = "";
  });
  it("responds to the native Escape cancel event without changing episode context", () => {
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    episode();
    fireEvent.click(screen.getByRole("button", { name: "Your series" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
  });
  it("restores scroll on unmount and explains empty locations", () => {
    const changed = structuredClone(blueprint); changed.world.locations = [];
    const { unmount } = render(<SeriesDrawer blueprint={changed} open onClose={vi.fn()} />);
    expect(screen.getByText("No locations established yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
