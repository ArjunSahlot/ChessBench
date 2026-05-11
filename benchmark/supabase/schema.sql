-- ChessBench public benchmark schema for Supabase.
-- Run this once in the SQL editor, then sync data with:
--   cd benchmark && npm run sync:supabase

create extension if not exists pg_trgm;

create table if not exists public.chessbench_engines (
  raw_engine_id text primary key,
  canonical_engine_id text not null,
  name text not null,
  provider text not null,
  provider_model text not null,
  model text,
  run_id text not null,
  root text not null,
  command jsonb,
  manifest jsonb,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null
);

create table if not exists public.chessbench_games (
  game_id text primary key,
  white_raw_engine_id text not null references public.chessbench_engines(raw_engine_id),
  black_raw_engine_id text not null references public.chessbench_engines(raw_engine_id),
  white_engine_id text not null,
  black_engine_id text not null,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  finished_at timestamptz,
  status text not null,
  result text,
  reason text,
  pgn text,
  config jsonb,
  time_control jsonb,
  opening_moves text[] not null default '{}',
  opening_fen text,
  opening_source text,
  opening_skip_reason text,
  white_clock_ms integer,
  black_clock_ms integer,
  result_source text,
  forfeiting_raw_engine_id text references public.chessbench_engines(raw_engine_id),
  forfeiting_engine_id text,
  migration_note text,
  updated_at timestamptz not null default now(),
  constraint chessbench_games_result_check
    check (result is null or result in ('1-0', '0-1', '1/2-1/2', '*'))
);

create table if not exists public.chessbench_moves (
  game_id text not null references public.chessbench_games(game_id) on delete cascade,
  ply integer not null,
  raw_engine_id text not null references public.chessbench_engines(raw_engine_id),
  engine_id text not null,
  move_uci text not null,
  fen_before text not null,
  fen_after text not null,
  elapsed_ms integer,
  clock_ms integer,
  created_at timestamptz not null,
  primary key (game_id, ply)
);

create table if not exists public.chessbench_game_errors (
  id bigint primary key,
  game_id text not null references public.chessbench_games(game_id) on delete cascade,
  raw_engine_id text references public.chessbench_engines(raw_engine_id),
  engine_id text,
  message text not null,
  created_at timestamptz not null
);

create table if not exists public.chessbench_engine_capabilities (
  raw_engine_id text primary key references public.chessbench_engines(raw_engine_id) on delete cascade,
  supports_openings boolean not null,
  reason text not null,
  checked_at timestamptz not null
);

create table if not exists public.chessbench_uci_events (
  id bigint primary key,
  game_id text not null references public.chessbench_games(game_id) on delete cascade,
  raw_engine_id text not null references public.chessbench_engines(raw_engine_id),
  engine_id text not null,
  direction text not null check (direction in ('in', 'out')),
  line text not null,
  created_at timestamptz not null
);

create table if not exists public.chessbench_leaderboard_snapshots (
  snapshot_id text primary key,
  generated_at timestamptz not null,
  anchors jsonb not null default '{}',
  synced_at timestamptz not null default now()
);

create table if not exists public.chessbench_leaderboard_entries (
  snapshot_id text not null references public.chessbench_leaderboard_snapshots(snapshot_id) on delete cascade,
  rank integer not null,
  engine_id text not null,
  name text not null,
  provider_model text not null,
  run_id text not null,
  elo integer not null,
  anchored boolean not null default false,
  games integer not null,
  wins integer not null,
  losses integer not null,
  draws integer not null,
  score numeric not null,
  score_pct numeric not null,
  win_pct numeric not null,
  draw_pct numeric not null,
  loss_pct numeric not null,
  white_games integer not null,
  white_score numeric not null,
  black_games integer not null,
  black_score numeric not null,
  avg_opponent_elo integer,
  primary key (snapshot_id, engine_id)
);

create index if not exists chessbench_games_finished_idx
  on public.chessbench_games (finished_at desc nulls last);
create index if not exists chessbench_games_white_idx
  on public.chessbench_games (white_engine_id);
create index if not exists chessbench_games_black_idx
  on public.chessbench_games (black_engine_id);
create index if not exists chessbench_games_result_idx
  on public.chessbench_games (result);
create index if not exists chessbench_games_status_idx
  on public.chessbench_games (status);
create index if not exists chessbench_games_reason_trgm_idx
  on public.chessbench_games using gin (reason gin_trgm_ops);
create index if not exists chessbench_moves_game_ply_idx
  on public.chessbench_moves (game_id, ply);
create index if not exists chessbench_leaderboard_rank_idx
  on public.chessbench_leaderboard_entries (snapshot_id, rank);

create or replace view public.chessbench_latest_snapshot as
select snapshot_id, generated_at, anchors, synced_at
from public.chessbench_leaderboard_snapshots
order by generated_at desc
limit 1;

create or replace view public.chessbench_leaderboard_public as
select
  entry.*,
  engine.provider,
  engine.model,
  engine.manifest,
  snapshot.generated_at
from public.chessbench_leaderboard_entries entry
join public.chessbench_latest_snapshot snapshot using (snapshot_id)
left join public.chessbench_engines engine on engine.canonical_engine_id = entry.engine_id;

create or replace view public.chessbench_games_public as
select
  game.game_id,
  game.white_engine_id,
  game.black_engine_id,
  game.white_raw_engine_id,
  game.black_raw_engine_id,
  white.name as white_name,
  black.name as black_name,
  white.provider as white_provider,
  black.provider as black_provider,
  white.provider_model as white_provider_model,
  black.provider_model as black_provider_model,
  game.scheduled_at,
  game.started_at,
  game.finished_at,
  game.status,
  game.result,
  game.reason,
  game.time_control,
  game.opening_moves,
  game.opening_fen,
  game.opening_source,
  game.opening_skip_reason,
  game.white_clock_ms,
  game.black_clock_ms,
  game.result_source,
  game.forfeiting_engine_id,
  game.migration_note,
  array[game.white_engine_id, game.black_engine_id] as participants,
  case
    when game.result = '1-0' then game.white_engine_id
    when game.result = '0-1' then game.black_engine_id
    else null
  end as winner_engine_id,
  exists (
    select 1
    from public.chessbench_game_errors err
    where err.game_id = game.game_id
  ) as has_error,
  coalesce(move_stats.plies, 0) as plies,
  move_stats.avg_elapsed_ms
from public.chessbench_games game
join public.chessbench_engines white on white.raw_engine_id = game.white_raw_engine_id
join public.chessbench_engines black on black.raw_engine_id = game.black_raw_engine_id
left join lateral (
  select count(*)::integer as plies, round(avg(elapsed_ms), 1) as avg_elapsed_ms
  from public.chessbench_moves move
  where move.game_id = game.game_id
) move_stats on true
where game.status != 'ignored';

create or replace view public.chessbench_moves_public as
select game_id, ply, engine_id, raw_engine_id, move_uci, fen_before, fen_after, elapsed_ms, clock_ms, created_at
from public.chessbench_moves;

create or replace view public.chessbench_game_errors_public as
select id, game_id, engine_id, raw_engine_id, message, created_at
from public.chessbench_game_errors;

alter table public.chessbench_engines enable row level security;
alter table public.chessbench_games enable row level security;
alter table public.chessbench_moves enable row level security;
alter table public.chessbench_game_errors enable row level security;
alter table public.chessbench_engine_capabilities enable row level security;
alter table public.chessbench_uci_events enable row level security;
alter table public.chessbench_leaderboard_snapshots enable row level security;
alter table public.chessbench_leaderboard_entries enable row level security;

drop policy if exists "Public read ChessBench engines" on public.chessbench_engines;
drop policy if exists "Public read ChessBench games" on public.chessbench_games;
drop policy if exists "Public read ChessBench moves" on public.chessbench_moves;
drop policy if exists "Public read ChessBench game errors" on public.chessbench_game_errors;
drop policy if exists "Public read ChessBench capabilities" on public.chessbench_engine_capabilities;
drop policy if exists "Public read ChessBench leaderboard snapshots" on public.chessbench_leaderboard_snapshots;
drop policy if exists "Public read ChessBench leaderboard entries" on public.chessbench_leaderboard_entries;

create policy "Public read ChessBench engines"
  on public.chessbench_engines for select using (true);
create policy "Public read ChessBench games"
  on public.chessbench_games for select using (true);
create policy "Public read ChessBench moves"
  on public.chessbench_moves for select using (true);
create policy "Public read ChessBench game errors"
  on public.chessbench_game_errors for select using (true);
create policy "Public read ChessBench capabilities"
  on public.chessbench_engine_capabilities for select using (true);
create policy "Public read ChessBench leaderboard snapshots"
  on public.chessbench_leaderboard_snapshots for select using (true);
create policy "Public read ChessBench leaderboard entries"
  on public.chessbench_leaderboard_entries for select using (true);

grant usage on schema public to anon, authenticated;
grant select on
  public.chessbench_engines,
  public.chessbench_games,
  public.chessbench_moves,
  public.chessbench_game_errors,
  public.chessbench_engine_capabilities,
  public.chessbench_leaderboard_snapshots,
  public.chessbench_leaderboard_entries,
  public.chessbench_latest_snapshot,
  public.chessbench_leaderboard_public,
  public.chessbench_games_public,
  public.chessbench_moves_public,
  public.chessbench_game_errors_public
to anon, authenticated;
