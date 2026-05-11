"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, Code2, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { ModelMark } from "@/components/ModelMark";
import { SiteNav } from "@/components/SiteNav";
import { fetchLeaderboard, fetchSummary } from "@/core/benchmark-api";
import { formatDate, formatInteger, formatPercent, resultBreakdown, scoreText } from "@/core/format";
import { hasSupabaseConfig } from "@/core/supabase";
import type { BenchmarkSummary, LeaderboardRow } from "@/core/types";

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState("");
  const configured = hasSupabaseConfig();

  useEffect(() => {
    if (!configured) return;
    Promise.all([fetchLeaderboard(8), fetchSummary()])
      .then(([rows, nextSummary]) => {
        setLeaderboard(rows);
        setSummary(nextSummary);
      })
      .catch((err: Error) => setError(err.message));
  }, [configured]);

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
                Language models are asked to write complete C++ UCI chess engines, then those generated engines play
                each other under the same tournament harness.
              </p>
              <div className="hero-actions">
                <Link className="primary-action" href="/leaderboard/">
                  View leaderboard <ArrowRight size={18} />
                </Link>
                <Link className="secondary-action" href="/methodology/">
                  How it works
                </Link>
              </div>
              <div className="hero-stats llm-stats">
                <Metric icon={<BrainCircuit />} label="LLM entries" value={summary ? formatInteger(summary.llm_models) : "--"} />
                <Metric icon={<Swords />} label="Finished games" value={summary ? formatInteger(summary.finished_games) : "--"} />
                <Metric icon={<Code2 />} label="Generated engines" value={summary ? formatInteger(summary.generated_engines) : "--"} />
              </div>
            </div>

            <div className="leaderboard-panel" aria-label="ChessBench ELO leaderboard">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Main leaderboard</p>
                  <h2>ELO standings</h2>
                </div>
                <span className="freshness">
                  {summary?.latest_finished_at ? `Updated ${formatDate(summary.latest_finished_at)}` : "Supabase required"}
                </span>
              </div>

              {!configured && <SetupNotice />}
              {configured && error && <div className="setup-notice error">Could not load Supabase data: {error}</div>}
              {configured && !error && leaderboard.length === 0 && <div className="table-skeleton">Loading leaderboard...</div>}

              {leaderboard.length > 0 && (
                <div className="leaderboard-list">
                  {leaderboard.map((row) => (
                    <Link
                      className="leaderboard-row professional"
                      href={`/games/?model=${encodeURIComponent(row.engine_id)}`}
                      key={row.engine_id}
                    >
                      <span className="rank-cell">{row.rank}</span>
                      <ModelMark model={row} />
                      <span className="elo-cell">{row.elo}</span>
                      <span className="leaderboard-record">
                        <strong>{formatPercent(row.score_pct)}</strong>
                        <small>{scoreText(row)}</small>
                        <small>{resultBreakdown(row)}</small>
                      </span>
                    </Link>
                  ))}
                  <Link className="full-leaderboard-link" href="/leaderboard/">
                    See full leaderboard <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section-band page-pad">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">What ChessBench measures</p>
              <h2>Can a model build a stronger chess engine?</h2>
            </div>
            <Link className="text-link" href="/methodology/">
              Read methodology <ArrowRight size={16} />
            </Link>
          </div>
          <div className="signal-grid">
            <SignalCard
              icon={<BrainCircuit />}
              title="Engine-building skill"
              body="Models must turn a prompt, tool calls, and limited iteration budget into a working C++ UCI engine."
            />
            <SignalCard
              icon={<Code2 />}
              title="Implementation quality"
              body="Generated engines need legal move generation, search, evaluation, time management, and a Makefile that compiles."
            />
            <SignalCard
              icon={<Trophy />}
              title="Over-the-board strength"
              body="The final score is earned in games, not judged from code style or self-reported capability."
            />
          </div>
        </section>
      </main>
    </>
  );
}

function SetupNotice() {
  return (
    <div className="setup-notice">
      Connect `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run the Supabase schema, then sync results
      with `uv run llm-chess sync-supabase`.
    </div>
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

function SignalCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="signal-card">
      <div className="signal-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}
