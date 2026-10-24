import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SheetViewImporter } from "./SheetViewImporter";
import type { ProductionReferenceRecord } from "@/lib/production-references/types";
const TEST_SERIES_ID = "70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892";
const source = { id: "source", characterId: "char", type: "CHARACTER", referenceRole: "OTHER", benchmarkOnly: false,
  status: "UPLOADED", assetUrl: "https://example.com/source.webp", checksum: "a".repeat(64), visualMetadata: { width: 853, height: 1280 } } as ProductionReferenceRecord;
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ previewUrl: "data:image/png;base64,AA==", visualRevision: "b".repeat(64) }) });
  vi.stubGlobal("fetch", fetcher);
  const saved = vi.fn(async () => {});
  const view = render(<SheetViewImporter seriesId={TEST_SERIES_ID} characterId="char" references={[source]} onSaved={saved} />);
  return { fetcher, saved, ...view };
}
async function preview() {
  fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
  return screen.findByAltText("Proposed cropped character view");
}
describe("explicit sheet import", () => {
  it.each(["source", "geometry", "preview"])("discards a pending plan after changing %s", async change => {
    const { fetcher } = setup();
    fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
    let resolve!: (value: string) => void;
    const file = new File(["{}"], "slow.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => new Promise<string>(done => { resolve = done; }) });
    fireEvent.change(screen.getByLabelText("Crop plan JSON"), { target: { files: [file] } });
    if (change === "source") fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "" } });
    if (change === "geometry") fireEvent.change(screen.getByLabelText("Crop left"), { target: { value: "10" } });
    if (change === "preview") fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
    await act(async () => resolve(JSON.stringify({
      format: "crayvo-sheet-crop-plan-v1", seriesId: TEST_SERIES_ID, characterId: "char",
      source: { sha256: source.checksum, width: 853, height: 1280 },
      views: [{ file: "front.png", label: "Stale suggestion", referenceRole: "FULL_BODY", crop: { left: 0, top: 0, width: 128, height: 256 } }]
    })));
    expect(screen.queryByLabelText("Crop plan view")).not.toBeInTheDocument();
    expect(screen.getByLabelText("View label")).toHaveValue("Front view");
    expect(fetcher).toHaveBeenCalledTimes(change === "preview" ? 1 : 0);
  });
  it.each(["checksum", "version", "status", "removed"])("discards a pending preview when source %s changes", async change => {
    const { fetcher, saved, rerender } = setup();
    let resolve!: (value: unknown) => void;
    fetcher.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
    const updated = { ...source,
      ...(change === "checksum" ? { checksum: "c".repeat(64) } : {}),
      ...(change === "version" ? { version: 2 } : {}),
      ...(change === "status" ? { status: "APPROVED" as const } : {})
    };
    rerender(<SheetViewImporter seriesId={TEST_SERIES_ID} characterId="char"
      references={change === "removed" ? [] : [updated]} onSaved={saved} />);
    await act(async () => resolve({ ok: true, json: async () => ({
      previewUrl: "data:image/png;base64,OLD=", visualRevision: "b".repeat(64)
    }) }));
    expect(screen.queryByAltText("Proposed cropped character view")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save view for review" })).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(saved).not.toHaveBeenCalled();
    if (change !== "removed") {
      fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
      const fresh = await screen.findByAltText("Proposed cropped character view");
      expect(fresh).toHaveAttribute("src", "data:image/png;base64,AA==");
      expect(screen.getByRole("button", { name: "Save view for review" })).toBeDisabled();
    }
  });
  it("does not restore an obsolete preview error after source removal", async () => {
    const { fetcher, saved, rerender } = setup();
    let reject!: (reason: Error) => void;
    fetcher.mockImplementationOnce(() => new Promise((_done, fail) => { reject = fail; }));
    fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
    rerender(<SheetViewImporter seriesId={TEST_SERIES_ID} characterId="char" references={[]} onSaved={saved} />);
    await act(async () => reject(new Error("Old request failed")));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview crop" })).toBeDisabled();
  });
  it("does no work on mount and requires source selection", () => {
    const { fetcher } = setup(); expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Preview crop" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review identity reference" })).toHaveAttribute("href", `/series/${TEST_SERIES_ID}/cast/char/reference-binding`);
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
  it("loads a source-bound crop plan without uploading or saving a reference", async () => {
    const { fetcher } = setup();
    fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
    const plan = {
      format: "crayvo-sheet-crop-plan-v1",
      seriesId: TEST_SERIES_ID, characterId: "char",
      source: { sha256: "a".repeat(64), width: 853, height: 1280 },
      views: [
        { file: "front.png", label: "Front model", referenceRole: "FULL_BODY",
          crop: { left: 22, top: 31, width: 200, height: 400 }, note: "Check the halo" },
        { file: "profile.png", label: "Profile model", referenceRole: "PROFILE",
          crop: { left: 250, top: 31, width: 200, height: 400 } }
      ]
    };
    const file = new File([JSON.stringify(plan)], "veya-plan.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(plan) });
    fireEvent.change(screen.getByLabelText("Crop plan JSON"), { target: { files: [file] } });
    await screen.findByText(/Loaded 2 crop suggestions/);
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByLabelText("View label")).toHaveValue("Front model");
    expect(screen.getByLabelText("Crop left")).toHaveValue(22);
    expect(screen.getByLabelText("Crop height")).toHaveValue(400);
    expect(screen.getByText("Check the halo")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Crop plan view"), { target: { value: "1" } });
    expect(screen.getByLabelText("View label")).toHaveValue("Profile model");
    expect(screen.getByLabelText("Crop left")).toHaveValue(250);
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Preview crop" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      action: "preview", referenceRole: "PROFILE", crop: { left: 250, top: 31, width: 200, height: 400 }
    });
  });
  it("rejects another source's crop plan locally without a network call", async () => {
    const { fetcher } = setup();
    fireEvent.change(screen.getByLabelText("Source sheet"), { target: { value: "source" } });
    const plan = { format: "crayvo-sheet-crop-plan-v1", seriesId: TEST_SERIES_ID,
      characterId: "char", source: { sha256: "b".repeat(64), width: 853, height: 1280 },
      views: [{ file: "front.png", label: "Front", referenceRole: "FULL_BODY",
        crop: { left: 0, top: 0, width: 128, height: 256 } }] };
    const file = new File([JSON.stringify(plan)], "wrong.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(plan) });
    fireEvent.change(screen.getByLabelText("Crop plan JSON"), { target: { files: [file] } });
    await screen.findByText("CROP_PLAN_SOURCE_MISMATCH");
    expect(screen.queryByLabelText("Crop plan view")).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("stale server revision requires a fresh preview", async () => {
    const { fetcher } = setup(); const image = await preview(); fireEvent.load(image); fireEvent.click(screen.getByRole("checkbox"));
    fetcher.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: { code: "CHARACTER_CHANGED_PREVIEW_AGAIN" } }) });
    fireEvent.click(screen.getByRole("button", { name: "Save view for review" }));
    await screen.findByText("CHARACTER_CHANGED_PREVIEW_AGAIN");
    expect(screen.queryByRole("button", { name: "Save view for review" })).not.toBeInTheDocument();
  });
});
