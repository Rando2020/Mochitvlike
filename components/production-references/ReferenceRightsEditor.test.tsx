import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductionReferenceRecord } from "@/lib/production-references/types";
import { ReferenceRightsEditor } from "./ReferenceRightsEditor";
const reference = {
  id: "reference-fixture", source: "OWNED", status: "UPLOADED", updatedAt: "2026-10-01T12:00:00Z",
  provenance: { source: "OWNED", creatorNameOrId: null, licenseIdOrDescription: null, sourceUrlOrRecord: null,
    permissions: { productionUse: null, commercialUse: null, modelConditioning: null, redistribution: null },
    projectSpecific: null, notes: "Preserve original provenance notes" }
} as ProductionReferenceRecord;
afterEach(() => vi.unstubAllGlobals());
function setup(record = reference) {
  const fetcher = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetcher);
  const onSaved = vi.fn(async () => {});
  const view = render(<ReferenceRightsEditor seriesId="fixture-series" reference={record} onSaved={onSaved} />);
  return { fetcher, onSaved, ...view };
}
function open() { fireEvent.click(screen.getByRole("button", { name: "Review rights" })); }
function confirmAndSave() {
  fireEvent.click(screen.getByRole("checkbox", { name: "I confirm these rights declarations are accurate." }));
  fireEvent.click(screen.getByRole("button", { name: "Save rights for review" }));
}
describe("ReferenceRightsEditor", () => {
  it("starts unknown without making requests; cancel discards edits", () => {
    const { fetcher } = setup(); open();
    for (const label of ["Production use", "Commercial use", "Model conditioning", "Redistribution"]) expect(screen.getByLabelText(label)).toHaveValue("unknown");
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Production use"), { target: { value: "allowed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel rights review" })); open();
    expect(screen.getByLabelText("Production use")).toHaveValue("unknown");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("saves only explicitly declared rights, preserving unknown/denied distinctions and notes", async () => {
    const { fetcher, onSaved } = setup(); open();
    fireEvent.change(screen.getByLabelText("Creator / rights holder"), { target: { value: "Fixture artist" } });
    fireEvent.change(screen.getByLabelText("License or rights record"), { target: { value: "Fixture license" } });
    fireEvent.change(screen.getByLabelText("Production use"), { target: { value: "allowed" } });
    fireEvent.change(screen.getByLabelText("Commercial use"), { target: { value: "denied" } });
    confirmAndSave();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe("/api/series/fixture-series/production-references/reference-fixture/rights");
    const request = fetcher.mock.calls[0][1];
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(request.body)).toEqual({ expectedUpdatedAt: reference.updatedAt, provenance: {
      ...reference.provenance, creatorNameOrId: "Fixture artist", licenseIdOrDescription: "Fixture license",
      permissions: { productionUse: true, commercialUse: false, modelConditioning: null, redistribution: null }
    } });
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
  it("requires a fresh acknowledgment after changing a declaration", () => {
    setup(); open();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Model conditioning"), { target: { value: "allowed" } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeDisabled();
  });
  it("blocks duplicate submits and cancel while saving", async () => {
    const { fetcher, onSaved } = setup(); open();
    let resolve!: (value: unknown) => void;
    fetcher.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    confirmAndSave();
    fireEvent.click(screen.getByRole("button", { name: "Save rights for review" }));
    expect(screen.getByRole("button", { name: "Cancel rights review" })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledOnce();
    await act(async () => resolve({ ok: true }));
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it.each([404, 409, 412])("requires reload after changed/inaccessible reference (%s)", async status => {
    const { fetcher } = setup(); fetcher.mockResolvedValueOnce({ ok: false, status }); open(); confirmAndSave();
    await screen.findByText(/This reference changed/);
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reload references" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("retains fields on validation rejection without making approvals", async () => {
    const { fetcher } = setup(); fetcher.mockResolvedValueOnce({ ok: false, status: 400 }); open(); confirmAndSave();
    await screen.findByText(/Rights could not be saved/);
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["network", "server"])("prevents save retries after uncertain %s result", async error => {
    const { fetcher, onSaved } = setup();
    if (error === "network") fetcher.mockRejectedValueOnce(new Error("lost response"));
    else fetcher.mockResolvedValueOnce({ ok: false, status: 500 });
    open(); confirmAndSave(); await screen.findByText(/Save response uncertain/);
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload references" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledOnce();
    open();
    expect(screen.getByLabelText("Production use")).toBeEnabled();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("does not repeat confirmed saves when refreshing fails", async () => {
    const { fetcher, onSaved } = setup(); onSaved.mockRejectedValueOnce(new Error("offline"));
    open(); confirmAndSave(); await screen.findByText(/Rights were saved, but references could not reload/);
    expect(screen.getByRole("button", { name: "Save rights for review" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload references" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["APPROVED", "ARCHIVED", "REJECTED"])("does not offer edits to %s references", status => {
    const { fetcher } = setup({ ...reference, status } as ProductionReferenceRecord);
    expect(screen.queryByRole("button")).not.toBeInTheDocument(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps synthetic project-specific permission unknown until chosen", () => {
    setup({ ...reference, source: "SYNTHETIC", provenance: { ...reference.provenance, source: "SYNTHETIC" } }); open();
    expect(screen.getByLabelText("Created specifically for this series")).toHaveValue("unknown");
  });
  it("does not refresh another view after unmounting during a save", async () => {
    const { fetcher, onSaved, unmount } = setup();
    let resolve!: (value: unknown) => void;
    fetcher.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    open(); confirmAndSave(); unmount();
    await act(async () => resolve({ ok: true }));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
