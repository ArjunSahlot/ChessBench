import Link from "next/link";
import { GitBranch, Grid3X3, Play } from "lucide-react";

export function SiteNav() {
  return (
    <header className="site-nav page-pad">
      <Link className="brand-lockup" href="/">
        <span className="brand-icon">
          <Grid3X3 size={18} />
        </span>
        <span>ChessBench</span>
      </Link>
      <nav aria-label="Primary">
        <Link href="/">Leaderboard</Link>
        <Link href="/methodology/">Methodology</Link>
        <Link href="/games/">Games</Link>
      </nav>
      <a className="nav-github" href="https://github.com/" rel="noreferrer" target="_blank" title="Repository">
        <GitBranch size={18} />
      </a>
      <Link className="nav-play" href="/games/" title="Open game browser">
        <Play size={17} />
      </Link>
    </header>
  );
}
