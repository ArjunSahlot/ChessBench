import type { LeaderboardRow } from "@/core/types";
import { formatInteger, formatPercent } from "@/core/format";

export function EloBar({ row, minElo, maxElo }: { row: LeaderboardRow; minElo: number; maxElo: number }) {
  const spread = Math.max(1, maxElo - minElo);
  const width = Math.max(8, Math.min(100, ((row.elo - minElo) / spread) * 100));

  return (
    <span className="elo-bar-cell" aria-label={`${row.elo} ELO`}>
      <strong>{formatInteger(row.elo)}</strong>
      <span className="elo-bar-track">
        <span style={{ width: `${width}%`, background: row.accent ?? "linear-gradient(90deg, var(--green), var(--cyan))" }} />
      </span>
    </span>
  );
}

export function RecordBadge({ row, compact = false }: { row: LeaderboardRow; compact?: boolean }) {
  const total = Math.max(1, row.wins + row.draws + row.losses);
  const winWidth = (row.wins / total) * 100;
  const drawWidth = (row.draws / total) * 100;
  const lossWidth = (row.losses / total) * 100;

  return (
    <span className={`record-badge ${compact ? "compact" : ""}`} aria-label={`${row.wins} wins, ${row.draws} draws, ${row.losses} losses`}>
      <span className="record-topline">
        <strong>{formatPercent(row.score_pct)}</strong>
        <small>{formatInteger(row.games)} games</small>
      </span>
      <span className="record-stack" aria-hidden="true">
        <span className="record-win" style={{ width: `${winWidth}%` }} />
        <span className="record-draw" style={{ width: `${drawWidth}%` }} />
        <span className="record-loss" style={{ width: `${lossWidth}%` }} />
      </span>
      <span className="record-counts">
        <span>{formatInteger(row.wins)}W</span>
        <span>{formatInteger(row.draws)}D</span>
        <span>{formatInteger(row.losses)}L</span>
      </span>
    </span>
  );
}
