import Link from "next/link";
import { Activity, ArrowRight, Database, Gauge, Swords, Trophy } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { ModelMark } from "@/components/ModelMark";
import { getSiteData } from "@/lib/static-data";
import { formatDate, formatInteger, formatPercent, resultLabel, winnerLabel } from "@/lib/format";

export default function HomePage() {
  const site = getSiteData();
  const top = site.leaderboard[0];
  const runnerUp = site.leaderboard[1];

  return (
    <>
      <SiteNav />
      <main>
        <section className="hero-shell">
          <div className="hero-board" aria-hidden="true" />
          <div className="hero-content page-pad">
            <div className="hero-copy">
              <p className="eyebrow">LLM chess engine benchmark</p>
              <h1>ChessBench</h1>
              <p className="hero-lede">
                A live ELO table for language models that write chess engines, then survive a round-robin tournament
                under the same harness.
              </p>
              <div className="hero-actions" aria-label="Primary navigation">
                <Link className="primary-action" href="/games/">
                  Explore games <ArrowRight size={18} />
                </Link>
                <Link className="secondary-action" href="/methodology/">
                  Methodology
                </Link>
              </div>
              <div className="hero-stats">
                <Metric icon={<Trophy />} label="Top ELO" value={top ? formatInteger(top.elo) : "n/a"} />
                <Metric icon={<Swords />} label="Finished games" value={formatInteger(site.summary.finished_games)} />
                <Metric icon={<Activity />} label="Recorded plies" value={formatInteger(site.summary.moves)} />
              </div>
            </div>

            <div className="leaderboard-panel" aria-label="ChessBench ELO leaderboard">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Main leaderboard</p>
                  <h2>ELO standings</h2>
                </div>
                <span className="freshness">Updated {formatDate(site.summary.elo_generated_at)}</span>
              </div>
              <div className="leaderboard-list">
                {site.leaderboard.map((row) => (
                  <Link className="leaderboard-row" href={`/games/?model=${encodeURIComponent(row.engine_id)}`} key={row.engine_id}>
                    <span className="rank-cell">{row.rank}</span>
                    <ModelMark model={row} />
                    <span className="elo-cell">{row.elo}</span>
                    <span className="score-track" aria-hidden="true">
                      <span style={{ width: `${Math.max(4, Math.min(100, row.score_pct))}%`, background: row.accent }} />
                    </span>
                    <span className="mini-record">
                      {row.wins}-{row.losses}-{row.draws}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-bottom page-pad">
            <div>
              <span>{top?.label ?? "Top model"}</span>
              <strong>{formatPercent(top?.score_pct)} score rate</strong>
            </div>
            <div>
              <span>{runnerUp?.label ?? "Second place"}</span>
              <strong>{runnerUp ? `${top.elo - runnerUp.elo} ELO gap` : "building"}</strong>
            </div>
            <div>
              <span>Public archive</span>
              <strong>{formatInteger(site.summary.total_games)} games indexed</strong>
            </div>
          </div>
        </section>

        <section className="section-band page-pad">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Field notes</p>
              <h2>What the benchmark is measuring</h2>
            </div>
            <Link className="text-link" href="/methodology/">
              Full methodology <ArrowRight size={16} />
            </Link>
          </div>
          <div className="signal-grid">
            <SignalCard
              icon={<Database />}
              title="Generated engines"
              value={formatInteger(site.summary.raw_engines)}
              body="Each entry starts as source code produced by a model and compiled inside the same local harness."
            />
            <SignalCard
              icon={<Gauge />}
              title="Round-robin play"
              value={formatInteger(site.summary.finished_games)}
              body="Games are scheduled across generated engines with saved clocks, openings, legal move traces, and PGN."
            />
            <SignalCard
              icon={<Trophy />}
              title="ELO estimation"
              value={formatInteger(site.summary.top_elo ?? 0)}
              body="Ratings are computed from head-to-head results, with optional anchors ready for future calibration."
            />
          </div>
        </section>

        <section className="section-band page-pad recent-band">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Recent archive</p>
              <h2>Latest tournament games</h2>
            </div>
            <Link className="text-link" href="/games/">
              Open game browser <ArrowRight size={16} />
            </Link>
          </div>
          <div className="recent-grid">
            {site.recent_games.slice(0, 8).map((game) => (
              <Link className="recent-game" href={`/games/?game=${game.game_id}`} key={game.game_id}>
                <span className={`result-pill ${game.is_draw ? "draw" : game.is_forfeit ? "forfeit" : "decisive"}`}>
                  {resultLabel(game.result)}
                </span>
                <strong>
                  {game.white_label} vs {game.black_label}
                </strong>
                <small>{winnerLabel(game)}</small>
                <span className="recent-meta">
                  {formatInteger(game.plies)} plies / {game.reason ?? game.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SignalCard({
  icon,
  title,
  value,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  body: string;
}) {
  return (
    <article className="signal-card">
      <div className="signal-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{body}</p>
    </article>
  );
}
