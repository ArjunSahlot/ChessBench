"use client";

import { useEffect, useState } from "react";

import { ModelMark } from "@/components/ModelMark";
import { SiteNav } from "@/components/SiteNav";
import { fetchLeaderboard } from "@/core/benchmark-api";
import { formatInteger, formatPercent, resultBreakdown, scoreText } from "@/core/format";
import { hasSupabaseConfig } from "@/core/supabase";
import type { LeaderboardRow } from "@/core/types";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState("");
  const configured = hasSupabaseConfig();

  useEffect(() => {
    if (!configured) return;
    fetchLeaderboard().then(setRows).catch((err: Error) => setError(err.message));
  }, [configured]);

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

        {!configured && (
          <div className="setup-notice large">Supabase is not configured, so deployment data is intentionally unavailable.</div>
        )}
        {configured && error && <div className="setup-notice error">Could not load leaderboard: {error}</div>}

        {rows.length > 0 && (
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
            {rows.map((row) => (
              <div className="leaderboard-table-row" key={row.engine_id}>
                <span className="rank-cell">{row.rank}</span>
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
        )}
      </main>
    </>
  );
}
