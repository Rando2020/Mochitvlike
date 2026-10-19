import Link from "next/link";
import { CrayvoBrand } from "@/components/brand/CrayvoBrand";
import { CRAYVO } from "@/lib/brand/crayvo";

export default function Home() {
  return <main className="ops-shell crayvo-home">
    <header className="crayvo-home-top"><CrayvoBrand /><Link href="/login" className="crayvo-signin">Sign in</Link></header>
    <section className="crayvo-home-grid">
      <div className="crayvo-home-copy">
        <p className="ops-eyebrow">YOUR IMAGINATION. YOUR STUDIO.</p>
        <h1>Stories become <span className="crayvo-gradient-text">worlds.</span></h1>
        <p className="crayvo-intro">Turn one idea into your own original series. Shape the characters, develop Episode 1, and build the world behind your story.</p>
        <nav className="ops-links" aria-label="Crayvo actions">
          <Link className="ops-button crayvo-primary" href="/create">Create a Show <span aria-hidden="true">✦</span></Link>
          <Link className="ops-button" href="/studio">Open Studio</Link>
        </nav>
        <p className="ops-note">Review your story direction before saving. Nothing is rendered or published automatically.</p>
      </div>
      <div className="crayvo-showcase" aria-label="Preview of the Crayvo production journey">
        <div className="crayvo-orbit crayvo-orbit-one" aria-hidden="true" />
        <div className="crayvo-orbit crayvo-orbit-two" aria-hidden="true" />
        <div className="crayvo-showcase-card"><span className="crayvo-card-eyebrow">YOUR CREATIVE UNIVERSE</span>
          <span className="crayvo-center-glyph" aria-hidden="true">✦</span>
          <h2>Imagine it. Shape it. Make it yours.</h2>
          <p>From an idea to a living story world.</p>
          <div className="crayvo-stages" aria-label="Creation stages">
            <span>01 IDEA</span><span>02 CAST</span><span>03 EPISODE</span>
          </div>
        </div>
      </div>
    </section>
    <section className="crayvo-capabilities" aria-label="What you can create">
      <article><span aria-hidden="true">◇</span><h2>Story foundation</h2><p>Develop a structured show proposal while keeping creative control.</p></article>
      <article><span aria-hidden="true">◉</span><h2>Character workshop</h2><p>Design roles, identities, and character direction for your series.</p></article>
      <article><span aria-hidden="true">▶</span><h2>Episode development</h2><p>Move from story beats into a reviewable Episode 1 production plan.</p></article>
    </section>
    <footer className="crayvo-footer"><p>{CRAYVO.action} <span>·</span> {CRAYVO.tagline}</p>
      <div><Link href="/creator-preview">Explore UX concept</Link> · <Link href="/system">Owner checks</Link> ·
        <a href="https://github.com/Rando2020/Mochitvlike/pulls">Preview Changes</a> ·
        <a href="https://github.com/Rando2020/Mochitvlike/actions">Build Status</a></div>
      <p className="crayvo-footnote">Creator concept features are marked as previews. Media output depends on enabled production services.</p>
    </footer>
  </main>;
}
