import { ModelMark } from "@/components/ModelMark";
import { SiteNav } from "@/components/SiteNav";
import landingData from "@/core/landing-data.json";
import { formatInteger, formatPercent, resultBreakdown, scoreText } from "@/core/format";
import type { LandingSnapshot, LeaderboardRow } from "@/core/types";

const rows = (landingData as LandingSnapshot).leaderboard.filter(
  (row) => row.provider !== "stockfish" && row.provider !== "megalodon",
) as LeaderboardRow[];

export default function LeaderboardPage() {
  return (
    <>
      <SiteNav />
      <main className="leaderboard-page page-pad">
        <section className="table-hero">
          <p className="eyebrow">Full ELO leaderboard</p>
          <h1>ChessBench standings</h1>
          <p>
            Ratings are computed from generated-engine games. Stockfish and internal reference engines may appear as
            calibration or sanity-check entries, but the benchmark is about LLM-created engines.
          </p>
        </section>

        <div className="leaderboard-table">
          <div className="leaderboard-table-head">
            <span>Rank</span>
            <span>Model</span>
            <span>ELO</span>
            <span>Score</span>
            <span>Games</span>
            <span>Record</span>
            <span>Avg opponent</span>
          </div>
          {rows.map((row, index) => (
            <div className="leaderboard-table-row" key={row.engine_id}>
              <span className="rank-cell">{index + 1}</span>
              <ModelMark model={row} />
              <strong>{formatInteger(row.elo)}</strong>
              <span>
                <strong>{formatPercent(row.score_pct)}</strong>
                <small>{scoreText(row)}</small>
              </span>
              <span>{formatInteger(row.games)}</span>
              <span>{resultBreakdown(row)}</span>
              <span>{row.avg_opponent_elo ? formatInteger(row.avg_opponent_elo) : "n/a"}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
