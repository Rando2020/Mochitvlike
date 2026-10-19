import type { SeriesBlueprint } from "@/lib/series/types";
import type { SeriesGenerationSource } from "@/lib/series/persistence/types";

export async function persistGeneratedSeries(input: {
  creationId?: string;
  seriesBlueprint: SeriesBlueprint;
  metadata: {
    source: SeriesGenerationSource;
    schemaVersion: "1.0";
  };
}) {
  const response = await fetch("/api/series", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code ?? "SERIES_PERSISTENCE_FAILED";
    throw new Error(code);
  }

  return response.json() as Promise<{
    series: {
      id: string;
      title: string;
      status: "DRAFT";
      createdAt: string;
    };
  }>;
}

export async function createSeriesAndEnter(
  router: { push(href: string): void },
  input: {
    creationId?: string;
    seriesBlueprint: SeriesBlueprint;
    metadata: {
      source: SeriesGenerationSource;
      schemaVersion: "1.0";
    };
  }
) {
  const result = await persistGeneratedSeries(input);
  router.push("/series/" + result.series.id);
  return result.series;
}
