export type LeaderboardRow = {
  rank: number;
  engine_id: string;
  name: string;
  provider_model: string;
  run_id: string;
  elo: number;
  anchored: boolean;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  score: number;
  score_pct: number;
  win_pct: number;
  draw_pct: number;
  loss_pct: number;
  white_games: number;
  white_score: number;
  black_games: number;
  black_score: number;
  avg_opponent_elo: number | null;
  provider?: string | null;
  model?: string | null;
  label?: string;
  logo?: string | null;
  accent?: string;
};

export type BenchmarkSummary = {
  latest_finished_at: string | null;
  finished_games: number;
  total_games: number;
  llm_models: number;
  generated_engines: number;
  moves: number;
};

export type LandingSnapshot = {
  generated_at: string;
  summary: BenchmarkSummary;
  leaderboard: LeaderboardRow[];
};

export type GameSummary = {
  game_id: string;
  white_engine_id: string;
  black_engine_id: string;
  white_raw_engine_id: string;
  black_raw_engine_id: string;
  white_name: string;
  black_name: string;
  white_provider: string;
  black_provider: string;
  white_provider_model: string;
  black_provider_model: string;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: string;
  result: string | null;
  reason: string | null;
  time_control: TimeControl | null;
  opening_moves: string[];
  opening_fen: string | null;
  opening_source: string | null;
  opening_skip_reason: string | null;
  white_clock_ms: number | null;
  black_clock_ms: number | null;
  result_source: string | null;
  forfeiting_engine_id: string | null;
  migration_note: string | null;
  participants: string[];
  winner_engine_id: string | null;
  has_error: boolean;
  plies: number;
  avg_elapsed_ms: number | null;
};

export type MoveRecord = {
  game_id?: string;
  ply: number;
  engine_id: string;
  raw_engine_id?: string;
  move_uci: string;
  fen_before: string;
  fen_after: string;
  elapsed_ms: number | null;
  clock_ms: number | null;
  created_at?: string;
};

export type GameError = {
  id?: number;
  engine_id: string | null;
  raw_engine_id?: string | null;
  message: string;
  created_at: string;
};

export type TimeControl = {
  movetime_ms?: number;
  init_ms?: number | null;
  increment_ms?: number;
  move_overhead_ms?: number;
};

export type GameDetail = GameSummary & {
  moves: MoveRecord[];
  errors: GameError[];
};

export type ApiState<T> =
  | { status: "missing-config"; data?: never; error?: never }
  | { status: "loading"; data?: never; error?: never }
  | { status: "error"; error: string; data?: never }
  | { status: "ready"; data: T; error?: never };
