import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import type { SceneSummary } from "@/lib/scenes/types";
import { selectActiveScenes, selectStudioNextStep } from "./studioGuide";
import { SeriesStudio } from "./SeriesStudio";

const blueprint = theWoundsWeKeep;
const seriesId = "22222222-2222-4222-8222-222222222222";
const scene = (beat: string, status: SceneSummary["status"] = "DRAFT"): SceneSummary => ({
  id: "11111111-1111-4111-8111-111111111111", sourceBeatId: beat, title: "Saved scene", status, updatedAt: "2026-10-03T00:00:00Z"
});

describe("creator guidance from saved state", () => {
  it("starts with the opening scene and resumes drafts before later beats", () => {
    expect(selectStudioNextStep(blueprint, []).kind).toBe("DEVELOP");
    expect(selectStudioNextStep(blueprint, [scene("beat_1")])).toMatchObject({ kind: "CONTINUE", number: 1 });
    expect(selectStudioNextStep(blueprint, [scene("beat_1", "READY")])).toMatchObject({ kind: "DEVELOP", number: 2 });
  });
  it("does not let later plans hide an earlier gap", () => {
    expect(selectStudioNextStep(blueprint, [scene("beat_2", "READY")])).toMatchObject({ kind: "DEVELOP", number: 1 });
  });
  it("ignores archived and unknown beats and counts each current beat once", () => {
    const older = { ...scene("beat_1", "READY"), updatedAt: "2026-10-01T00:00:00Z" };
    expect(selectActiveScenes(blueprint, [older, scene("beat_1"), scene("beat_2", "ARCHIVED"), scene("unknown")])).toEqual([scene("beat_1")]);
    expect(selectActiveScenes(blueprint, [scene("beat_1"), older])).toEqual([scene("beat_1")]);
  });
  it("reviews fully ready plans without claiming rendered media", () => {
    const scenes = blueprint.episodeOne.beats.map(beat => scene(beat.id, "READY"));
    expect(selectStudioNextStep(blueprint, scenes)).toEqual({ kind: "REVIEW" });
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} sceneSummaries={scenes} />);
    fireEvent.click(screen.getByRole("button", { name: "Review episode" }));
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
  });
  it("offers an alternate scene without creating anything", () => {
    const develop = vi.fn();
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} onDevelopScene={develop} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose another scene" }));
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
    expect(develop).not.toHaveBeenCalled();
  });
  it("opens the existing draft without requesting generation", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} sceneSummaries={[scene("beat_1")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open scene 1" }));
    expect(useRouter().push).toHaveBeenCalledWith(`/series/${seriesId}/scenes/${scene("beat_1").id}`);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
  it("prevents duplicate scene requests and recovers from network errors", async () => {
    let fail!: (reason: Error) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    fireEvent.click(screen.getByRole("button", { name: "Create scene 1 plan" }));
    expect(screen.getByRole("button", { name: "Developing scene…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Develop Scene" }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    fail(new Error("offline"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Check your connection"));
    expect(screen.getByRole("button", { name: "Create scene 1 plan" })).toBeEnabled();
    fetcher.mockRestore();
  });
  it("creates a canonical scene plan and opens the saved scene", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({scene: {id: scene("beat_1").id}})));
    render(<SeriesStudio blueprint={blueprint} seriesId={seriesId} />);
    fireEvent.click(screen.getByRole("button", { name: "Create scene 1 plan" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith(`/api/series/${seriesId}/scenes/generate`, expect.objectContaining({body: JSON.stringify({episodeKey: "episodeOne", beatId: "beat_1"})})));
    await waitFor(() => expect(screen.getByRole("button", { name: "Create scene 1 plan" })).toBeEnabled());
    expect(useRouter().push).toHaveBeenCalledWith(`/series/${seriesId}/scenes/${scene("beat_1").id}`);
    fetcher.mockRestore();
  });
  it("keeps demo exploration local", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    render(<SeriesStudio blueprint={blueprint} seriesId="demo" />);
    fireEvent.click(screen.getByRole("button", { name: "Explore episode" }));
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Develop Scene" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
});
