import type { GameSummary, LeaderboardRow, TimeControl } from "./types";

export function formatInteger(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function formatPercent(value: number | null | undefined): string {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function modelLabel(row: Pick<LeaderboardRow, "name" | "provider_model">): string {
  const raw = (row.name || row.provider_model).replace(/\/.+$/, "");
  return raw
    .replace(/^(openai|anthropic|gemini|deepseek|kimi|moonshot)-/, "")
    .replace(/(?<=\d)-(?=\d)/g, ".")
    .replace(/-/g, " ")
    .replace(/\bgpt\b/gi, "GPT")
    .replace(/\bdeepseek\b/gi, "DeepSeek")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function providerLabel(provider?: string | null): string {
  if (!provider) return "Unknown";
  if (provider === "openai") return "OpenAI";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "deepseek") return "DeepSeek";
  if (provider === "gemini") return "Google";
  if (provider === "kimi" || provider === "moonshot") return "Moonshot";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function resultLabel(result: string | null | undefined): string {
  if (result === "1/2-1/2") return "Draw";
  return result ?? "*";
}

export function timeControlLabel(timeControl?: TimeControl | null): string {
  if (!timeControl) return "unknown";
  if (timeControl.init_ms === null || timeControl.init_ms === undefined) {
    return `${timeControl.movetime_ms ?? 0}ms/move`;
  }
  return `${Math.round(timeControl.init_ms / 1000)}s + ${timeControl.increment_ms ?? 0}ms`;
}

export function durationLabel(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "n/a";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function gameHeadline(game: GameSummary): string {
  if (game.result === "1/2-1/2") return "Draw";
  if (game.winner_engine_id === game.white_engine_id) return `${modelName(game.white_name)} won`;
  if (game.winner_engine_id === game.black_engine_id) return `${modelName(game.black_name)} won`;
  return game.status;
}

export function modelName(value: string): string {
  return modelLabel({ name: value, provider_model: value });
}

export function resultBreakdown(row: LeaderboardRow): string {
  return `${formatInteger(row.wins)} wins, ${formatInteger(row.losses)} losses, ${formatInteger(row.draws)} draws`;
}

export function scoreText(row: LeaderboardRow): string {
  return `${row.score.toFixed(1)} / ${formatInteger(row.games)} points`;
}
