import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CharacterDirectionEditor } from "./CharacterDirectionEditor";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { EMPTY_CHARACTER_DIRECTION } from "@/lib/character-direction/schema";
const proposed = { ...EMPTY_CHARACTER_DIRECTION, body: "athletic" };
const review = { expectedRevision: "a".repeat(64), impactRevision: "b".repeat(64), reviewId: "c".repeat(64), current: EMPTY_CHARACTER_DIRECTION,
  proposed, changes: [{ group: "body", before: "Story default", after: "Athletic" }], impact: [{ label: "Character references", count: 2 }], visualChanged: true };
function show(archived = false) { return render(<CharacterDirectionEditor seriesId="show" member={theWoundsWeKeep.cast[1]} archived={archived} />); }
async function openReview() {
  fireEvent.change(screen.getByLabelText("Body build"), { target: { value: "athletic" } });
  fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
  await screen.findByRole("heading", { name: "Review proposed changes" });
}
const acknowledge = () => fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed/ }));
beforeEach(() => vi.clearAllMocks()); afterEach(() => vi.restoreAllMocks());
describe("Cast direction review UX", () => {
  it("reviews before saving, shows exact changes and impact, and requires acknowledgment", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ review }))).mockResolvedValueOnce(new Response(JSON.stringify({ saved: true, direction: proposed })));
    show(); await openReview();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ action: "review", direction: proposed });
    expect(screen.getByText("Character references: 2")).toBeInTheDocument();
    expect(screen.getByText(/New production frames for this character will be blocked/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save direction" })).toBeDisabled();
    acknowledge(); fireEvent.click(screen.getByRole("button", { name: "Save direction" }));
    await screen.findByRole("heading", { name: "Direction saved" });
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ action: "save", direction: proposed, expectedRevision: review.expectedRevision,
      impactRevision: review.impactRevision, reviewId: review.reviewId, acknowledgeImpact: true });
  });
  it("keeps choices after a revision conflict and requires fresh review", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ review }))).mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "This series changed. Review again." } }), { status: 409 }));
    show(); await openReview(); acknowledge(); fireEvent.click(screen.getByRole("button", { name: "Save direction" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Body build")).toHaveValue("athletic");
    expect(screen.getByRole("button", { name: "Review changes" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Save direction" })).not.toBeInTheDocument();
  });
  it("retries an uncertain save using the identical proposal and cannot edit meanwhile", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ review }))).mockRejectedValueOnce(new Error("Network interrupted"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true, direction: proposed })));
    show(); await openReview(); acknowledge(); fireEvent.click(screen.getByRole("button", { name: "Save direction" }));
    await screen.findByRole("alert"); expect(screen.getByRole("button", { name: "Back to edit" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry reviewed save" }));
    await screen.findByRole("heading", { name: "Direction saved" });
    expect(fetcher.mock.calls[1][1]?.body).toBe(fetcher.mock.calls[2][1]?.body);
  });
  it("back to edit has no write and invalidates acknowledgment", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ review })));
    show(); await openReview(); acknowledge(); fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(fetcher).toHaveBeenCalledTimes(1); expect(screen.getByLabelText("Body build")).toHaveValue("athletic");
    fireEvent.click(screen.getByRole("button", { name: "Review changes" })); await screen.findByRole("heading", { name: "Review proposed changes" });
    expect(screen.getByRole("button", { name: "Save direction" })).toBeDisabled();
  });
  it("fails review without offering save and leaves archived series read-only", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { message: "Impact unavailable" } }), { status: 503 }));
    const view = show(); fireEvent.click(screen.getByRole("button", { name: "Review changes" })); await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Save direction" })).not.toBeInTheDocument(); view.unmount(); show(true);
    expect(screen.getByLabelText("Body build")).toBeDisabled(); expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled();
  });
  it("preloads existing directions and prevents duplicate submissions", async () => {
    let resolve!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(value => { resolve = value; }));
    render(<CharacterDirectionEditor seriesId="show" member={{ ...theWoundsWeKeep.cast[1], generationDirection: { ...EMPTY_CHARACTER_DIRECTION, voiceTexture: "warm" } }} archived={false} />);
    expect(screen.getByLabelText("Voice texture")).toHaveValue("warm");
    const button = screen.getByRole("button", { name: "Review changes" }); fireEvent.click(button); fireEvent.click(button);
    expect(fetcher).toHaveBeenCalledTimes(1); resolve(new Response(JSON.stringify({ review })));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Review proposed changes" })).toBeInTheDocument());
  });
});
