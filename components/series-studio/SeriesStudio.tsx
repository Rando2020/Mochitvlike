"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SceneSummary } from "@/lib/scenes/types";
import type { CastMember, SeriesBlueprint, StudioFeatureType } from "@/lib/series/types";
import { CanonPanel } from "./CanonPanel";
import { CastDetailSheet } from "./CastDetailSheet";
import { CastStrip } from "./CastStrip";
import { ClarificationCard, type ClarificationChoice } from "./ClarificationCard";
import { CreativeDNA } from "./CreativeDNA";
import { EpisodeHero } from "./EpisodeHero";
import { SeriesHeader } from "./SeriesHeader";
import { StoryEnginePanel } from "./StoryEnginePanel";
import { StudioFeatureGrid } from "./StudioFeatureGrid";
import { WorldPanel } from "./WorldPanel";
import { selectPrimaryFeatures, selectSecondaryFeatures } from "./selectors";
import styles from "./SeriesStudio.module.css";

type StudioTab = "studio" | "episode" | "cast" | "world" | "bible";

const NAV_ITEMS: Array<{ id: StudioTab; label: string; icon: string }> = [
  { id: "studio", label: "Studio", icon: "✦" },
  { id: "episode", label: "Episode", icon: "▶" },
  { id: "cast", label: "Cast", icon: "◉" },
  { id: "world", label: "World", icon: "⌖" },
  { id: "bible", label: "Bible", icon: "≡" }
];

export type SeriesStudioProps = {
  blueprint: SeriesBlueprint;
  seriesId: string;
  sceneSummaries?: SceneSummary[];
  onDevelopScene?: (beatId: string) => void | Promise<void>;
  onOpenFeature?: (type: StudioFeatureType) => void;
  onClarificationAnswer?: (questionId: string, choice: ClarificationChoice) => void;
};

function SeasonSnapshot({ blueprint }: { blueprint: SeriesBlueprint }) {
  return (
    <section className={styles.panel} aria-labelledby="season-heading">
      <div className={styles.sectionEyebrow}>Season arc</div>
      <h2 id="season-heading">{blueprint.season.seasonQuestion}</h2>
      <div className={styles.seasonTimeline}>
        <div><span>Beginning</span><p>{blueprint.season.beginning}</p></div>
        <div><span>Escalation</span><p>{blueprint.season.escalation}</p></div>
        <div><span>Midpoint</span><p>{blueprint.season.midpoint}</p></div>
        <div><span>Crisis</span><p>{blueprint.season.crisis}</p></div>
        <div><span>Finale</span><p>{blueprint.season.finale}</p></div>
      </div>
    </section>
  );
}

export function SeriesStudio({
  blueprint,
  seriesId,
  sceneSummaries = [],
  onDevelopScene,
  onOpenFeature,
  onClarificationAnswer
}: SeriesStudioProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudioTab>("studio");
  const [selectedCast, setSelectedCast] = useState<CastMember | null>(null);
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(blueprint.episodeOne.beats[0]?.id ?? null);
  const [sceneError, setSceneError] = useState<string | null>(null);

  const primaryFeatures = useMemo(() => selectPrimaryFeatures(blueprint), [blueprint]);
  const secondaryFeatures = useMemo(() => selectSecondaryFeatures(blueprint), [blueprint]);
  const sceneByBeat = useMemo(
    () => new Map(sceneSummaries.map((scene) => [scene.sourceBeatId, scene])),
    [sceneSummaries]
  );

  const goToEpisode = () => {
    setActiveTab("episode");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToBible = () => {
    setActiveTab("bible");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleBeat = (beatId: string) => {
    setExpandedBeatId((current) => current === beatId ? null : beatId);
  };

  const handleScene = async (beatId: string) => {
    if (onDevelopScene) {
      await onDevelopScene(beatId);
      return;
    }

    const existing = sceneByBeat.get(beatId);
    if (existing) {
      router.push(`/series/${seriesId}/scenes/${existing.id}`);
      return;
    }

    setSceneError(null);

    const response = await fetch(`/api/series/${seriesId}/scenes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeKey: "episodeOne",
        beatId
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSceneError(body?.error?.code ?? "SCENE_GENERATION_FAILED");
      return;
    }

    const body = await response.json() as { scene: { id: string } };
    router.push(`/series/${seriesId}/scenes/${body.scene.id}`);
  };

  const header = (
    <SeriesHeader
      blueprint={blueprint}
      onContinueEpisode={goToEpisode}
      onOpenBible={goToBible}
    />
  );

  const episodeHero = (
    <>
      {sceneError ? (
        <div className={styles.contextualEmpty} role="alert">
          This scene could not be developed safely yet. Try again when the story context is available.
        </div>
      ) : null}
      <EpisodeHero
        blueprint={blueprint}
        sceneSummaries={sceneSummaries}
        expandedBeatId={expandedBeatId}
        onToggleBeat={toggleBeat}
        onDevelopScene={handleScene}
      />
    </>
  );

  return (
    <div className={styles.studioRoot} data-series-id={seriesId}>
      <aside className={styles.desktopNav} aria-label="Series Studio navigation">
        <div className={styles.brandMark} aria-label="Series Studio">M</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeTab === item.id ? styles.navButtonActive : styles.navButton}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => setActiveTab(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.studioMain}>
        <div className={styles.contentFrame}>
          {activeTab === "studio" ? (
            <div className={styles.tabScene} data-testid="studio-tab">
              {header}
              <ClarificationCard blueprint={blueprint} onAnswer={onClarificationAnswer} />
              <div className={styles.dashboardGrid}>
                <div className={styles.dashboardPrimary}>
                  {episodeHero}
                  <CastStrip cast={blueprint.cast} onSelect={setSelectedCast} />
                </div>
                <div className={styles.dashboardSecondary}>
                  <StudioFeatureGrid features={primaryFeatures} blueprint={blueprint} onOpen={onOpenFeature} />
                  <StoryEnginePanel blueprint={blueprint} />
                </div>
              </div>
              <CreativeDNA blueprint={blueprint} />
              <StudioFeatureGrid title="Story Tools" features={secondaryFeatures} blueprint={blueprint} onOpen={onOpenFeature} />
            </div>
          ) : null}

          {activeTab === "episode" ? (
            <div className={styles.tabScene} data-testid="episode-tab">
              {header}
              {episodeHero}
              <StoryEnginePanel blueprint={blueprint} />
            </div>
          ) : null}

          {activeTab === "cast" ? (
            <div className={styles.tabScene} data-testid="cast-tab">
              {header}
              <CastStrip cast={blueprint.cast} onSelect={setSelectedCast} />
              <p><a href={`/series/${seriesId}/references`}>Open Production Reference Studio</a></p>
              <section className={styles.castRoster}>
                {blueprint.cast.map((member) => (
                  <button type="button" key={member.id} onClick={() => setSelectedCast(member)}>
                    <span>{member.role.replaceAll("_", " ")}</span>
                    <strong>{member.name}</strong>
                    <p>{member.storyFunction}</p>
                  </button>
                ))}
              </section>
            </div>
          ) : null}

          {activeTab === "world" ? (
            <div className={styles.tabScene} data-testid="world-tab">
              {header}
              <WorldPanel blueprint={blueprint} />
              <StudioFeatureGrid
                title="World Tools"
                features={blueprint.studioFeatures.filter((feature) =>
                  ["POWER_SYSTEM", "LOCATION_MAP", "FACTION_TRACKER", "INVENTORY", "QUESTS", "ABILITY_TRACKER"].includes(feature.type)
                )}
                blueprint={blueprint}
                onOpen={onOpenFeature}
              />
            </div>
          ) : null}

          {activeTab === "bible" ? (
            <div className={styles.tabScene} data-testid="bible-tab">
              {header}
              <div className={styles.bibleGrid}>
                <CreativeDNA blueprint={blueprint} />
                <StoryEnginePanel blueprint={blueprint} />
                <WorldPanel blueprint={blueprint} />
                <SeasonSnapshot blueprint={blueprint} />
                <CanonPanel blueprint={blueprint} />
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <nav className={styles.mobileNav} aria-label="Series Studio navigation">
        {NAV_ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeTab === item.id ? styles.mobileNavActive : styles.mobileNavButton}
            aria-current={activeTab === item.id ? "page" : undefined}
            onClick={() => setActiveTab(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <CastDetailSheet seriesId={seriesId} member={selectedCast} onClose={() => setSelectedCast(null)} />
    </div>
  );
}
