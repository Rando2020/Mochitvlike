import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { SeriesStudio } from "./SeriesStudio";

describe("Series Studio scene development", () => {
  it("shows Continue Scene when a beat already has a durable scene plan", () => {
    render(
      <SeriesStudio
        seriesId="22222222-2222-4222-8222-222222222222"
        blueprint={theWoundsWeKeep}
        sceneSummaries={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            sourceBeatId: "beat_1",
            title: "The Choice to Heal",
            status: "DRAFT",
            updatedAt: "2026-09-28T04:00:00Z"
          }
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Continue Scene" })).toBeInTheDocument();
    expect(screen.getByText("Hook · planned")).toBeInTheDocument();
  });

  it("calls the scene-development flow for an unplanned beat", () => {
    const develop = vi.fn();

    render(
      <SeriesStudio
        seriesId="22222222-2222-4222-8222-222222222222"
        blueprint={theWoundsWeKeep}
        sceneSummaries={[]}
        onDevelopScene={develop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Develop Scene" }));
    expect(develop).toHaveBeenCalledWith("beat_1");
  });

  it("describes episode progress as planned rather than rendered", () => {
    render(
      <SeriesStudio
        seriesId="22222222-2222-4222-8222-222222222222"
        blueprint={theWoundsWeKeep}
        sceneSummaries={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            sourceBeatId: "beat_1",
            title: "The Choice to Heal",
            status: "DRAFT",
            updatedAt: "2026-09-28T04:00:00Z"
          }
        ]}
      />
    );

    expect(screen.getByLabelText("20% planned")).toBeInTheDocument();
    expect(screen.queryByText(/rendered/i)).not.toBeInTheDocument();
  });
});
