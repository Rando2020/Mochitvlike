import Link from "next/link";
export default function Home() {
  return <main className="ops-shell">
    <p className="ops-eyebrow">YOUR CREATIVE WORKSPACE</p>
    <h1>Your studio, one click away.</h1>
    <p>Create a show from an idea, or continue Episode 1 in a saved project. Everything runs in your browser.</p>
    <nav className="ops-links" aria-label="Project access">
      <Link className="ops-button" href="/create">Create a Show</Link>
      <Link className="ops-button" href="/studio">Open Studio</Link>
      <Link className="ops-button" href="/login">Sign in</Link>
      <a className="ops-button" href="https://github.com/Rando2020/Mochitvlike/pulls">Preview Changes</a>
      <a className="ops-button" href="https://github.com/Rando2020/Mochitvlike/actions">Build Status</a>
    </nav>
    <p>Preview links appear on pull requests after hosting is connected.</p>
    <p><Link href="/system">Owner connection checks</Link> · <a href="https://github.com/Rando2020/Mochitvlike/blob/main/docs/BROWSER_FIRST_SETUP.md">Setup guide</a></p>
  </main>;
}
