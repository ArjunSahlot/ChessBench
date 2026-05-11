import Link from "next/link";
import { GitBranch, Play } from "lucide-react";
import Image from "next/image";

export function SiteNav() {
  return (
    <header className="site-nav page-pad">
      <Link className="brand-lockup" href="/">
        <Image src="/assets/logo.png" alt="ChessBench Logo" width={40} height={40} className="pixelated" unoptimized/>
        <span>Chess<span className="brand-bench">Bench</span></span>
      </Link>
      <nav aria-label="Primary">
        <Link href="/leaderboard/">Leaderboard</Link>
        <Link href="/methodology/">Methodology</Link>
        <Link href="/games/">Games</Link>
      </nav>
      <a
        className="nav-github"
        href="https://github.com/ArjunSahlot/ChessBench"
        rel="noreferrer"
        target="_blank"
        title="Repository"
      >
        <GitBranch size={18} />
      </a>
      <Link className="nav-play" href="/games/" title="Open game browser">
        <Play size={17} />
      </Link>
    </header>
  );
}
