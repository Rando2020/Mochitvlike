"use client";

import { useMemo, useState } from "react";
import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./CreatorExperiencePreview.module.css";
import { StorySeedsWorkspace } from "./StorySeedsWorkspace";

type View = "watch" | "create" | "story" | "cast" | "rewards";
type SeedType = "EVENT" | "REVEAL" | "RELATIONSHIP" | "ENDING";
type Placement = "OPENING" | "MIDPOINT" | "FINALE" | "UNPLACED";
type Seed = { id: string; title: string; type: SeedType; placement: Placement; characterId: string; locked: boolean };
type ChatLine = { role: "creator" | "preview"; text: string };
const NAV: Array<{ id: View; symbol: string; label: string }> = [
  { id: "watch", symbol: "▶", label: "Watch" },
  { id: "create", symbol: "✦", label: "Create" },
  { id: "story", symbol: "◇", label: "Story" },
  { id: "cast", symbol: "◉", label: "Cast" },
  { id: "rewards", symbol: "◎", label: "Coins" }
];
const SEED_TYPES: SeedType[] = ["EVENT", "REVEAL", "RELATIONSHIP", "ENDING"];
const PLACEMENTS: Placement[] = ["OPENING", "MIDPOINT", "FINALE", "UNPLACED"];
function initialSeeds(blueprint: SeriesBlueprint): Seed[] {
  const protagonist = blueprint.cast.find((member) => member.role === "PROTAGONIST") ?? blueprint.cast[0];
  return [
    { id: "sample-opening", title: blueprint.episodeOne.hook, type: "EVENT", placement: "OPENING", characterId: protagonist?.id ?? "", locked: false },
    { id: "sample-middle", title: blueprint.season.midpoint, type: "REVEAL", placement: "MIDPOINT", characterId: protagonist?.id ?? "", locked: false },
    { id: "sample-ending", title: blueprint.season.finale, type: "ENDING", placement: "FINALE", characterId: protagonist?.id ?? "", locked: true }
  ];
}
function initialFrom(blueprint: SeriesBlueprint) {
  return blueprint.cast.find((character) => character.role === "PROTAGONIST")?.id ?? blueprint.cast[0]?.id ?? "";
}
function storyPrompt(character: SeriesBlueprint["cast"][number]): string {
  return "What would " + character.name + " refuse to admit to someone they care about?";
}
function exampleResponse(character: SeriesBlueprint["cast"][number]): string {
  return "Sample character direction, not live AI: " + character.name + " wants to " +
    character.want.charAt(0).toLowerCase() + character.want.slice(1) +
    " Their internal contradiction: " + character.internalConflict +
    " A scene could reveal this through a choice instead of exposition.";
}
export function CreatorExperiencePreview({ blueprint, seriesId }: { blueprint: SeriesBlueprint; seriesId?: string }) {
  const [view, setView] = useState<View>("create");
  const [storyWasOpened, setStoryWasOpened] = useState(false);
  const [storyHasUnsavedChanges, setStoryHasUnsavedChanges] = useState(false);
  function changeView(next: View) {
    if (next === "story") setStoryWasOpened(true);
    setView(next);
  }
  const [advanced, setAdvanced] = useState(false);
  const [seeds, setSeeds] = useState<Seed[]>(() => initialSeeds(blueprint));
  const [draft, setDraft] = useState("");
  const [seedType, setSeedType] = useState<SeedType>("EVENT");
  const [placement, setPlacement] = useState<Placement>("UNPLACED");
  const [characterId, setCharacterId] = useState(() => initialFrom(blueprint));
  const [seedError, setSeedError] = useState("");
  const [chatMode, setChatMode] = useState<"director" | "rehearsal" | "fan">("rehearsal");
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [chibiMode, setChibiMode] = useState<"none" | "occasional" | "frequent">("occasional");
  const [sharing, setSharing] = useState<"private" | "cameo" | "guest">("private");
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState<"standard" | "cinematic">("standard");
  const [idea, setIdea] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const protagonist = blueprint.cast.find((member) => member.role === "PROTAGONIST") ?? blueprint.cast[0];
  const character = blueprint.cast.find((member) => member.id === characterId) ?? protagonist;
  const estimate = useMemo(() => Math.ceil((duration / 5) * (quality === "cinematic" ? 36 : 14)), [duration, quality]);
  const lockedCount = seeds.filter((seed) => seed.locked).length;
  const demo = !seriesId;
  function addSeed(text = draft) {
    const title = text.trim();
    if (!title || title.length > 240) {
      setSeedError("Enter a story event between 1 and 240 characters.");
      return;
    }
    if (seeds.some((seed) => seed.title.toLowerCase() === title.toLowerCase())) {
      setSeedError("That seed already exists in this preview.");
      return;
    }
    setSeeds((previous) => previous.concat({
      id: "draft-" + (previous.length + 1) + "-" + Date.now().toString(),
      title, type: seedType, placement, characterId, locked: false
    }));
    setDraft("");
    setSeedError("");
    setAdvanced(true);
  }
  function sendSample() {
    const text = chatInput.trim();
    if (!text || !character) return;
    const response = chatMode === "director"
      ? "Sample story note, not live AI: This scene could pressure " + character.name + "'s need: " + character.need + " Check the consequences before making it canon."
      : chatMode === "fan"
        ? "Sample fan-chat preview only. A real fan mode would know published events, not private story plans."
        : exampleResponse(character);
    setChatLines((previous) => [...previous.slice(-4), { role: "creator", text }, { role: "preview", text: response }]);
    setChatInput("");
  }
  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <a className={styles.logo} href="#preview-top" aria-label="Creator preview home">✳</a>
        <span className={styles.railCaption}>CREATOR PREVIEW</span>
        <nav aria-label="Creator preview sections">
          {NAV.map((item) => (
            <button key={item.id} type="button" aria-current={view === item.id ? "page" : undefined}
              className={view === item.id ? styles.railActive : styles.railButton}
              onClick={() => changeView(item.id)}><span>{item.symbol}</span>{item.label}</button>
          ))}
        </nav>
      </aside>
      <div className={styles.main} id="preview-top">
        <header className={styles.topbar}>
          <div className={styles.brand}><span className={styles.brandIcon}>✳</span><span>Creator Studio <small>EXPERIENCE CONCEPT</small></span></div>
          <div className={styles.headerRight}><span className={styles.previewPill}>● Interactive prototype</span>{seriesId ? <a className={styles.backLink} href={"/series/" + encodeURIComponent(seriesId)}>Existing studio ↗</a> : null}</div>
        </header>
        <div className={styles.notice} role="status"><strong>{seriesId ? "Creator Studio preview." : "UX preview only."}</strong> {seriesId ? "The Story tab can save your own story seeds when its database migration is installed. Watch, Create, Cast and Coins are still concepts. No media jobs or paid inference occur." : "Controls change this session's sample state. No saving, real character chat, sharing, coins, publishing, or AI/GPU generation occurs."}</div>
        {seriesId && storyHasUnsavedChanges && view !== "story" && (
          <div className={styles.notice} role="status"><strong>Unsaved Story Architect changes are still here.</strong> Switch back to save or review them.{" "}
            <button type="button" onClick={() => changeView("story")}>Return to Story Architect ↗</button>
          </div>
        )}
        <main className={styles.content}>
          {view === "watch" && (
            <section className={styles.page}>
              <div className={styles.heading}><span className={styles.eyebrow}>DISCOVER STORIES</span><h1>Find a world worth <em>falling into.</em></h1><p>Watch original stories and discover the creators behind them. Media playback and community feeds are future integrations.</p></div>
              <div className={styles.watchHero}>
                <div className={styles.poster}><div className={styles.posterArt}><span>✺</span><i>EVERY WOUND<br/>LEAVES AN ECHO.</i></div></div>
                <div className={styles.posterCopy}><span className={styles.eyebrow}>FEATURED CONCEPT · DARK FANTASY</span><h2>{blueprint.identity.title}</h2><p>{blueprint.identity.logline}</p>
                  <div className={styles.chips}><span>Short series</span><span>Character-driven</span><span>Fantasy</span></div>
                  <button type="button" className={styles.primary} onClick={() => changeView("story")}>Explore this story <span>↗</span></button>
                  <span className={styles.micro}>Storyboard preview, not playable media</span>
                </div>
              </div>
              <div className={styles.sectionHead}><h2>What makes a story stay with you?</h2><p>Stories, characters and creators, all connected.</p></div>
              <div className={styles.threeColumns}>
                <article className={styles.miniCard}><span className={styles.bigIcon}>◇</span><h3>Follow the story</h3><p>Episodes, character arcs and meaningful turning points.</p></article>
                <article className={styles.miniCard}><span className={styles.bigIcon}>◉</span><h3>Meet the cast</h3><p>Explore approved character profiles and conversations.</p><button type="button" onClick={() => changeView("cast")}>View cast ↗</button></article>
                <article className={styles.miniCard}><span className={styles.bigIcon}>✦</span><h3>Make your own</h3><p>Start from one idea or build your whole universe.</p><button type="button" onClick={() => changeView("create")}>Start creating ↗</button></article>
              </div>
            </section>
          )}
          {view === "create" && (
            <section className={styles.page}>
              <div className={styles.heading}><span className={styles.eyebrow}>YOUR CREATIVE SPACE</span><h1>Every story starts <em>somewhere.</em></h1><p>Start with a single idea. When you're ready, step into the director's chair.</p></div>
              <div className={styles.createGrid}>
                <div className={styles.largeCard}>
                  <span className={styles.eyebrow}>QUICK CREATE</span><h2>What do you want to make?</h2><p>You don't need a perfect outline. Just tell us the spark.</p>
                  <label className={styles.fieldLabel} htmlFor="preview-idea">Your idea</label>
                  <textarea id="preview-idea" maxLength={1000} value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="A healer discovers every injury he cures turns into a creature inside him…" rows={4}/>
                  <div className={styles.formFooter}><span>{idea.length} / 1000</span><button className={styles.primary} type="button" disabled={!idea.trim()} onClick={() => setShowDetails(true)}>Preview next steps ✦</button></div>
                  {showDetails && <div className={styles.inlineInfo} role="status"><strong>Your idea is ready for a story outline.</strong><p>In the live flow, Show Genesis would turn this into a validated proposal, ask for approval, and save it. This preview does not submit or persist your idea.</p><button type="button" onClick={() => changeView("story")}>Explore Story Architect ↗</button></div>}
                </div>
                <div className={styles.spotlightCard}><span className={styles.eyebrow}>DIRECTOR'S STUDIO</span><span className={styles.spotlightGlyph}>✳</span><h2>You imagine the moments. We'll help you connect them.</h2><p>Build plot seeds, interview characters, develop relationships, and design the performances that bring them to life.</p><button type="button" className={styles.lightButton} onClick={() => {changeView("story");setAdvanced(true);}}>Enter Story Architect ↗</button></div>
              </div>
              <div className={styles.sectionHead}><h2>Your creative toolkit</h2><p>One canon, many ways to make something.</p></div>
              <div className={styles.threeColumns}>
                <article className={styles.miniCard}><span className={styles.bigIcon}>◇</span><h3>Plot the turning points</h3><p>Work backwards from your ending, connect events, lock your must-haves.</p><button type="button" onClick={() => changeView("story")}>Story architect ↗</button></article>
                <article className={styles.miniCard}><span className={styles.bigIcon}>◉</span><h3>Bring characters to life</h3><p>Develop personality, voice, expressions and chibi performances.</p><button type="button" onClick={() => changeView("cast")}>Cast workshop ↗</button></article>
                <article className={styles.miniCard}><span className={styles.bigIcon}>◎</span><h3>Plan your production</h3><p>Quote costly animation before spending any production credits.</p><button type="button" onClick={() => changeView("rewards")}>Credit preview ↗</button></article>
              </div>
            </section>
          )}
          {seriesId && storyWasOpened && <div hidden={view !== "story"}><StorySeedsWorkspace seriesId={seriesId} blueprint={blueprint} onDirtyChange={setStoryHasUnsavedChanges}/></div>}
          {view === "story" && !seriesId && (
            <section className={styles.page}>
              <div className={styles.heading}><span className={styles.eyebrow}>STORY ARCHITECT · {blueprint.identity.title.toUpperCase()}</span><h1>Make every moment <em>mean something.</em></h1><p>Plant the seeds of your story. Lock the moments you can't imagine changing. The rest can grow around them.</p></div>
              <div className={styles.storyToolbar}><div><strong>{seeds.length} story seeds</strong><small>{lockedCount} locked · Session-only preview</small></div><div className={styles.segment} aria-label="Story editor mode"><button type="button" aria-pressed={!advanced} className={!advanced ? styles.selectedSegment : ""} onClick={() => setAdvanced(false)}>Guided</button><button type="button" aria-pressed={advanced} className={advanced ? styles.selectedSegment : ""} onClick={() => setAdvanced(true)}>Advanced</button></div></div>
              <div className={styles.storyLayout}>
                <div className={styles.largeCard}>
                  <span className={styles.eyebrow}>PLANT A STORY SEED</span><h2>{advanced ? "Plot an event with intention." : "What's one moment you want to happen?"}</h2><p>Start anywhere. Your ending, a betrayal, an emotional confession, anything.</p>
                  <label className={styles.fieldLabel} htmlFor="seed-draft">Describe the moment</label>
                  <textarea id="seed-draft" rows={3} maxLength={240} value={draft} onChange={(event) => {setDraft(event.target.value);setSeedError("");}} placeholder="I want the mentor to reveal that they started the war…"/>
                  {advanced && <div className={styles.fields}>
                    <label>Seed type<select value={seedType} onChange={(event) => setSeedType(event.target.value as SeedType)}>{SEED_TYPES.map((type) => <option key={type} value={type}>{type[0] + type.slice(1).toLowerCase()}</option>)}</select></label>
                    <label>Story placement<select value={placement} onChange={(event) => setPlacement(event.target.value as Placement)}>{PLACEMENTS.map((type) => <option key={type} value={type}>{type[0] + type.slice(1).toLowerCase()}</option>)}</select></label>
                    <label>Character<select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{blueprint.cast.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
                  </div>}
                  {seedError && <p className={styles.error} role="alert">{seedError}</p>}
                  <div className={styles.formFooter}><span>Uncommitted concept</span><button className={styles.primary} type="button" onClick={() => addSeed()}>Add story seed +</button></div>
                </div>
                <aside className={styles.assistantPanel}><span className={styles.eyebrow}>WRITER'S ROOM</span><div className={styles.assistantAvatar}>✦</div><h3>Need help connecting the dots?</h3><p>In the future, your writing assistant can identify missing setup, explore motivations, and suggest emotional payoffs without changing locked canon.</p><div className={styles.suggestion}>Try this prompt:<strong>“I know my ending. Help me earn it without making the twist obvious.”</strong></div><button type="button" onClick={() => {changeView("cast");setChatMode("director");}}>Explore director chat ↗</button></aside>
              </div>
              <div className={styles.sectionHead}><h2>Your story map</h2><p>{advanced ? "Organized by narrative placement." : "The events you've imagined so far."}</p></div>
              <div className={styles.timeline}>
                {(advanced ? PLACEMENTS : ["OPENING", "MIDPOINT", "FINALE", "UNPLACED"] as Placement[]).map((section) => {
                  const entries = seeds.filter((seed) => seed.placement === section);
                  return <div className={styles.timelineGroup} key={section}><div className={styles.timelineLabel}><span className={styles.timelineDot}/>{section === "UNPLACED" ? "UNPLACED IDEAS" : section}</div><div className={styles.seedStack}>{entries.length ? entries.map((seed) => <article className={styles.seedCard} key={seed.id}><div className={styles.seedMeta}><span>{seed.type}</span><span>{blueprint.cast.find((member) => member.id === seed.characterId)?.name ?? "Series"}</span></div><p>{seed.title}</p><div className={styles.seedActions}><button type="button" aria-pressed={seed.locked} onClick={() => setSeeds((previous) => previous.map((item) => item.id === seed.id ? {...item,locked:!item.locked} : item))}>{seed.locked ? "🔒 Locked" : "🔓 Lock this"}</button>{seed.id.startsWith("draft-") && <button type="button" onClick={() => setSeeds((previous) => previous.filter((item) => item.id !== seed.id))}>Remove</button>}</div></article>) : <p className={styles.emptySeed}>No seeds here yet. It can stay open.</p>}</div></div>;
                })}
              </div>
              <div className={styles.inlineInfo}><strong>Canon stays protected.</strong><p>All edits here are temporary. The production version needs revision-safe persistence, creator approval, and a story impact check before existing episodes or approved canon can change.</p></div>
            </section>
          )}
          {view === "cast" && (
            <section className={styles.page}>
              <div className={styles.heading}><span className={styles.eyebrow}>CHARACTER WORKSHOP</span><h1>Characters worth <em>remembering.</em></h1><p>Give every person a point of view, a performance style, and a life beyond the page.</p></div>
              <div className={styles.castSelector} role="group" aria-label="Choose a character">{blueprint.cast.map((member) => <button type="button" key={member.id} aria-pressed={character?.id === member.id} className={character?.id === member.id ? styles.castSelected : styles.castOption} onClick={() => {setCharacterId(member.id);setChatLines([]);}}><span className={styles.initial}>{member.name.slice(0,1)}</span><strong>{member.name}</strong><small>{member.role.toLowerCase()}</small></button>)}</div>
              {character && <><div className={styles.characterHero}><div className={styles.characterPortrait}><span>{character.name.slice(0,1)}</span><small>CANONICAL CHARACTER</small></div><div><span className={styles.eyebrow}>{character.role}</span><h2>{character.name}</h2><p>{character.summary}</p><div className={styles.chips}>{character.personalityTraits.slice(0,3).map((trait) => <span key={trait}>{trait}</span>)}</div><div className={styles.characterMotivation}><strong>Wants</strong><span>{character.want}</span><strong>Needs</strong><span>{character.need}</span></div></div></div>
              <div className={styles.storyLayout}>
                <div className={styles.largeCard}><span className={styles.eyebrow}>CHARACTER CONVERSATIONS · SCRIPTED UX PREVIEW</span><h2>Step into the writers' room.</h2><div className={styles.segment} aria-label="Conversation mode">{(["director", "rehearsal", "fan"] as const).map((mode) => <button type="button" key={mode} aria-pressed={chatMode === mode} className={chatMode === mode ? styles.selectedSegment : ""} onClick={() => {setChatMode(mode);setChatLines([]);}}>{mode === "director" ? "Director" : mode === "rehearsal" ? "Rehearse" : "Fan mode"}</button>)}</div>
                  <p className={styles.modeHelp}>{chatMode === "director" ? "Creator-only story analysis. Future assistant can see approved and private planning context." : chatMode === "rehearsal" ? "In-character rehearsal at a chosen story point. Future responses must respect character knowledge." : "Public-facing preview. Future fan chat must never expose private canon or future plot twists."}</p>
                  <div className={styles.chatWindow} aria-live="polite"><div className={styles.botLine}>✦ This is a deterministic sample, not a connected AI chatbot. Try a prompt to see the intended interaction.</div>{chatLines.map((line, index) => <div key={index} className={line.role === "creator" ? styles.userLine : styles.botLine}>{line.text}</div>)}</div>
                  <form className={styles.chatForm} onSubmit={(event) => {event.preventDefault();sendSample();}}><label className={styles.visuallyHidden} htmlFor="sample-prompt">Preview a conversation prompt</label><input id="sample-prompt" maxLength={240} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={storyPrompt(character)}/><button className={styles.primary} type="submit" disabled={!chatInput.trim()}>Send ↗</button></form>
                </div>
                <aside className={styles.assistantPanel}><span className={styles.eyebrow}>CHARACTER PERFORMANCE</span><h3>Does {character.name} need a chibi form?</h3><p>Switch to expressive, super-deformed acting only when the scene's tone supports it. Canonical identity stays unchanged.</p><fieldset className={styles.radioStack}><legend>Comic expression frequency</legend>{([{id:"none",label:"No chibi"},{id:"occasional",label:"Only for comedic beats"},{id:"frequent",label:"Part of regular acting"}] as const).map((option) => <label key={option.id}><input type="radio" name="chibi" value={option.id} checked={chibiMode === option.id} onChange={() => setChibiMode(option.id)}/>{option.label}</label>)}</fieldset><div className={styles.chibiSample} aria-label="Stylized performance variant illustration">{chibiMode === "none" ? "◉" : "ᵔᴥᵔ"}<small>{chibiMode === "none" ? "Standard identity only" : "Illustrative expression, not generated asset"}</small></div></aside>
              </div>
              <div className={styles.largeCard}><span className={styles.eyebrow}>CHARACTER EXCHANGE · FUTURE FEATURE</span><h2>Let your cast visit other worlds.</h2><p>Creator-owned characters should be private by default. Guest appearances, attribution, commercial permission and revocation require an explicit grant.</p><div className={styles.sharingOptions}>{([{id:"private",label:"Private",detail:"Not offered to other creators"},{id:"cameo",label:"Cameo",detail:"Brief approved appearances"},{id:"guest",label:"Guest role",detail:"Story use requiring approval"}] as const).map((option) => <button key={option.id} type="button" className={sharing === option.id ? styles.shareSelected : styles.shareOption} aria-pressed={sharing === option.id} onClick={() => setSharing(option.id)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div><p className={styles.micro}>Permission draft: {sharing}. No character has been published, licensed, or shared.</p></div></>}
            </section>
          )}
          {view === "rewards" && (
            <section className={styles.page}>
              <div className={styles.heading}><span className={styles.eyebrow}>CREATOR ECONOMY · DESIGN CONCEPT</span><h1>Good stories deserve <em>room to grow.</em></h1><p>Earn credit from meaningful community activity and plan your productions before spending compute.</p></div>
              <div className={styles.coinHero}><div><span className={styles.eyebrow}>ILLUSTRATIVE REWARD WALLET</span><h2>120 <span>coins</span></h2><p>Example balance only. No account ledger is connected.</p></div><span className={styles.coinGlyph}>◎</span></div>
              <div className={styles.storyLayout}><div className={styles.largeCard}><span className={styles.eyebrow}>PRODUCTION COST ESTIMATOR</span><h2>Choose where quality counts.</h2><p>Example pricing based on a hypothetical coin economy. Real quotes must use measured GPU costs and reserve credits before work begins.</p><label className={styles.sliderLabel} htmlFor="duration">Scene duration <strong>{duration} seconds</strong></label><input id="duration" type="range" min="3" max="20" value={duration} onChange={(event) => setDuration(Number(event.target.value))}/><label className={styles.fieldLabel} htmlFor="quality">Rendering tier</label><select id="quality" value={quality} onChange={(event) => setQuality(event.target.value as "standard" | "cinematic")}><option value="standard">Standard animation</option><option value="cinematic">Cinematic motion and detail</option></select><div className={styles.quote}><span>Example quote</span><strong>{estimate} coins</strong></div><p className={styles.micro}>No generation or credit charge can be triggered from this preview.</p></div>
              <aside className={styles.assistantPanel}><span className={styles.eyebrow}>CREATE → SHARE → GROW</span><h3>Earn by participating meaningfully.</h3><div className={styles.rewardLine}><span>Daily creative prompt</span><strong>+2</strong></div><div className={styles.rewardLine}><span>Weekly creator challenge</span><strong>+15</strong></div><div className={styles.rewardLine}><span>Qualified story engagement</span><strong>Variable</strong></div><p>Rewards should be budget-capped and fraud-resistant. Views alone must not mint unlimited compute credits.</p></aside></div>
              <div className={styles.sectionHead}><h2>Make the meaningful parts free.</h2></div><div className={styles.inlineInfo}><strong>Writing shouldn't cost the same as rendering.</strong><p>Story planning, canon review, script editing, and creative exploration should remain accessible. Expensive image, audio and motion jobs should get transparent estimates before the creator spends.</p></div>
            </section>
          )}
        </main>
        <footer className={styles.footer}><span>Story first. Characters always. Production with purpose.</span><span>{demo ? "Demo blueprint" : "Owned series read-only preview"} · Not production features</span></footer>
      </div>
      <nav className={styles.mobileNav} aria-label="Creator preview mobile navigation">{NAV.map((item) => <button key={item.id} type="button" aria-current={view === item.id ? "page" : undefined} className={view === item.id ? styles.mobileActive : styles.mobileButton} onClick={() => changeView(item.id)}><span>{item.symbol}</span>{item.label}</button>)}</nav>
    </div>
  );
}
