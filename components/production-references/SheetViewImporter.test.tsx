import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SheetViewImporter } from "./SheetViewImporter";
import type { ProductionReferenceRecord } from "@/lib/production-references/types";
const source = { id: "source", characterId: "char", type: "CHARACTER", referenceRole: "OTHER", benchmarkOnly: false,
  status: "UPLOADED", assetUrl: "https://example.com/source.webp", checksum: "a".repeat(64), visualMetadata: { width: 853, height: 1280 } } as ProductionReferenceRecord;
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ previewUrl: "data:image/png;base64,AA==", visualRevision: "b".repeat(64) }) });
  vi.stubGlobal("fetch", fetcher);
  const saved = vi.fn(async () => {});
  render(<SheetViewImporter seriesId="series" characterId="char" references={[source]} onSaved={saved} />);
  return { fetcher, saved };
}
async function preview() {
  fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
  return screen.findByAltText("Proposed cropped character view");
}
describe("explicit sheet import", () => {
  it("does no work on mount and requires source selection", () => {
    const { fetcher } = setup(); expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Preview crop" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review identity reference" })).toHaveAttribute("href", "/series/series/cast/char/reference-binding");
  });
  it("requires loaded preview and inspection, saves only for review", async () => {
    const { fetcher, saved } = setup(); const image = await preview();
    expect(screen.getByRole("button", { name: "Save view for review" })).toBeDisabled();
    fireEvent.load(image); fireEvent.click(screen.getByRole("checkbox"));
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ reference: { id: "view", status: "REVIEW_REQUIRED" } }) });
    fireEvent.click(screen.getByRole("button", { name: "Save view for review" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ action: "save", expectedVisualRevision: "b".repeat(64), referenceRole: "FULL_BODY" });
    expect(fetcher.mock.calls.every(([url]) => !url.includes("approve") && !url.includes("generate"))).toBe(true);
  });
  it("changing geometry discards the preview and inspection", async () => {
    setup(); const image = await preview(); fireEvent.load(image); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Crop width"), { target: { value: "180" } });
    expect(screen.queryByRole("button", { name: "Save view for review" })).not.toBeInTheDocument();
  });
  it("blocks duplicate clicks and uncertain save retries", async () => {
    const { fetcher } = setup(); const image = await preview(); fireEvent.load(image); fireEvent.click(screen.getByRole("checkbox"));
    fetcher.mockRejectedValueOnce(new Error("Network lost"));
    const button = screen.getByRole("button", { name: "Save view for review" });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByText(/Save response uncertain/);
    expect(fetcher).toHaveBeenCalledTimes(2); expect(button).toBeDisabled();
  });
  it("stale server revision requires a fresh preview", async () => {
    const { fetcher } = setup(); const image = await preview(); fireEvent.load(image); fireEvent.click(screen.getByRole("checkbox"));
    fetcher.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: { code: "CHARACTER_CHANGED_PREVIEW_AGAIN" } }) });
    fireEvent.click(screen.getByRole("button", { name: "Save view for review" }));
    await screen.findByText("CHARACTER_CHANGED_PREVIEW_AGAIN");
    expect(screen.queryByRole("button", { name: "Save view for review" })).not.toBeInTheDocument();
  });
});
