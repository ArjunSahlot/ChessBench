"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  BadgeAlert,
  ChevronDown,
  Filter,
  PanelRightOpen,
  Search,
  Shield,
  Swords,
  X,
} from "lucide-react";

import { GameReplay } from "@/components/GameReplay";
import { ModelMark } from "@/components/ModelMark";
import { durationLabel, formatInteger, formatShortDate, resultLabel, winnerLabel } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import type { GameDetail, GameSummary, ModelSummary, SiteData } from "@/lib/types";

type ResultFilter = "all" | "wins" | "losses" | "draws" | "forfeits";

const PAGE_SIZE = 48;

export function GamesExplorer({ site }: { site: SiteData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [modelFilter, setModelFilter] = useState(searchParams.get("model") ?? "all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>((searchParams.get("result") as ResultFilter) ?? "all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState(searchParams.get("game") ?? "");
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/games-index.json")
      .then((response) => response.json() as Promise<GameSummary[]>)
      .then((payload) => {
        if (!cancelled) {
          setGames(payload);
          setGamesLoading(false);
        }
      })
      .catch(() => setGamesLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGames = useMemo(() => {
    const text = query.trim().toLowerCase();
    return games.filter((game) => {
      const modelMatch =
        modelFilter === "all" || game.white_engine_id === modelFilter || game.black_engine_id === modelFilter;
      const textMatch =
        !text ||
        game.game_id.toLowerCase().includes(text) ||
        game.white_label.toLowerCase().includes(text) ||
        game.black_label.toLowerCase().includes(text) ||
        game.opening_label.toLowerCase().includes(text) ||
        (game.reason ?? "").toLowerCase().includes(text);
      const resultMatch = matchesResult(game, modelFilter, resultFilter);
      return modelMatch && textMatch && resultMatch;
    });
  }, [games, modelFilter, query, resultFilter]);

  const visibleGames = filteredGames.slice(0, visibleCount);
  const selectedSummary = useMemo(
    () => filteredGames.find((game) => game.game_id === selectedId) ?? filteredGames[0] ?? null,
    [filteredGames, selectedId],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [modelFilter, query, resultFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredGames.length));
        }
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredGames.length]);

  useEffect(() => {
    if (!selectedSummary) {
      setDetail(null);
      return;
    }
    setSelectedId(selectedSummary.game_id);
    let cancelled = false;
    setDetailLoading(true);
    loadGameDetail(selectedSummary)
      .then((payload) => {
        if (!cancelled) {
          setDetail(payload);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSummary]);

  const updateUrl = useCallback(
    (next: { game?: string; model?: string; result?: ResultFilter; q?: string }) => {
      const params = new URLSearchParams();
      const game = next.game ?? selectedId;
      const model = next.model ?? modelFilter;
      const result = next.result ?? resultFilter;
      const text = next.q ?? query;
      if (game) params.set("game", game);
      if (model !== "all") params.set("model", model);
      if (result !== "all") params.set("result", result);
      if (text.trim()) params.set("q", text.trim());
      router.replace(`/games/${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    },
    [modelFilter, query, resultFilter, router, selectedId],
  );

  const selectGame = useCallback(
    (gameId: string) => {
      setSelectedId(gameId);
      startTransition(() => updateUrl({ game: gameId }));
    },
    [updateUrl],
  );

  const clearFilters = () => {
    setQuery("");
    setModelFilter("all");
    setResultFilter("all");
    router.replace("/games/", { scroll: false });
  };

  return (
    <section className="games-shell">
      <div className="games-toolbar">
        <div>
          <p className="eyebrow">Game archive</p>
          <h1>{formatInteger(filteredGames.length)} games</h1>
        </div>
        <div className="toolbar-actions">
          <span className="source-pill">
            <Shield size={15} /> Static index
          </span>
          <button className="icon-text-button" onClick={clearFilters}>
            <X size={16} /> Clear filters
          </button>
        </div>
      </div>

      <div className="games-layout">
        <aside className="games-list-panel">
          <div className="filter-grid">
            <label className="field-shell search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  startTransition(() => updateUrl({ q: event.target.value }));
                }}
                placeholder="Search games, models, openings"
              />
            </label>

            <label className="field-shell select-field">
              <Filter size={17} />
              <select
                value={modelFilter}
                onChange={(event) => {
                  setModelFilter(event.target.value);
                  startTransition(() => updateUrl({ model: event.target.value }));
                }}
              >
                <option value="all">All models</option>
                {site.models.map((model) => (
                  <option key={model.engine_id} value={model.engine_id}>
                    {model.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </label>

            <label className="field-shell select-field">
              <ArrowDownUp size={17} />
              <select
                value={resultFilter}
                onChange={(event) => {
                  const value = event.target.value as ResultFilter;
                  setResultFilter(value);
                  startTransition(() => updateUrl({ result: value }));
                }}
              >
                <option value="all">All results</option>
                <option value="wins">Model wins</option>
                <option value="losses">Model losses</option>
                <option value="draws">Draws</option>
                <option value="forfeits">Forfeits</option>
              </select>
              <ChevronDown size={16} />
            </label>
          </div>

          <div className="model-strip" aria-label="Quick model filters">
            {site.models.slice(0, 8).map((model) => (
              <button
                className={modelFilter === model.engine_id ? "active" : ""}
                key={model.engine_id}
                onClick={() => {
                  const next = modelFilter === model.engine_id ? "all" : model.engine_id;
                  setModelFilter(next);
                  startTransition(() => updateUrl({ model: next }));
                }}
              >
                <ModelMark model={model} compact />
              </button>
            ))}
          </div>

          <div className="game-list-header">
            <span>{gamesLoading ? "Loading" : `Showing ${formatInteger(visibleGames.length)}`}</span>
            <span>{isPending ? "Filtering" : `${formatInteger(filteredGames.length)} matches`}</span>
          </div>

          <div className="game-list-stream">
            {visibleGames.map((game) => (
              <button
                className={`game-row ${selectedSummary?.game_id === game.game_id ? "active" : ""}`}
                key={game.game_id}
                onClick={() => selectGame(game.game_id)}
              >
                <span className={`result-pill ${game.is_draw ? "draw" : game.is_forfeit ? "forfeit" : "decisive"}`}>
                  {resultLabel(game.result)}
                </span>
                <span className="game-row-main">
                  <strong>
                    {game.white_label} <em>vs</em> {game.black_label}
                  </strong>
                  <small>{winnerLabel(game)}</small>
                </span>
                <span className="game-row-meta">
                  <span>{formatInteger(game.plies)} plies</span>
                  <span>{durationLabel(game.avg_elapsed_ms)}</span>
                </span>
              </button>
            ))}
            {!gamesLoading && visibleGames.length === 0 && (
              <div className="empty-list">
                <BadgeAlert size={26} />
                <span>No games match those filters.</span>
              </div>
            )}
            <div ref={sentinelRef} className="scroll-sentinel" />
          </div>
        </aside>

        <section className="game-detail-stage">
          {detailLoading && <div className="detail-loading">Loading replay...</div>}
          {detail ? (
            <GameReplay detail={detail} models={site.models} />
          ) : (
            <div className="empty-detail">
              <PanelRightOpen size={30} />
              <span>Select a game to open the replay board.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function matchesResult(game: GameSummary, modelFilter: string, resultFilter: ResultFilter): boolean {
  if (resultFilter === "all") {
    return true;
  }
  if (resultFilter === "draws") {
    return game.result === "1/2-1/2";
  }
  if (resultFilter === "forfeits") {
    return game.is_forfeit;
  }
  if (modelFilter === "all") {
    return resultFilter === "wins" ? game.result === "1-0" || game.result === "0-1" : false;
  }
  const played = game.white_engine_id === modelFilter || game.black_engine_id === modelFilter;
  if (!played || game.result === "1/2-1/2" || !game.winner_engine_id) {
    return false;
  }
  return resultFilter === "wins" ? game.winner_engine_id === modelFilter : game.winner_engine_id !== modelFilter;
}

async function loadGameDetail(summary: GameSummary): Promise<GameDetail> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const remote = await loadRemoteGameDetail(summary, supabase);
    if (remote) {
      return remote;
    }
  }

  const response = await fetch(`/data/games/${summary.game_id}.json`);
  if (response.ok) {
    return (await response.json()) as GameDetail;
  }
  return { ...summary, moves: [], errors: [], detail_available: false };
}

async function loadRemoteGameDetail(summary: GameSummary, supabase: ReturnType<typeof getSupabaseBrowserClient>) {
  if (!supabase) {
    return null;
  }
  const [{ data: game }, { data: moves }, { data: errors }] = await Promise.all([
    supabase.from("chessbench_games_public").select("*").eq("game_id", summary.game_id).maybeSingle(),
    supabase.from("chessbench_moves_public").select("*").eq("game_id", summary.game_id).order("ply"),
    supabase.from("chessbench_game_errors_public").select("*").eq("game_id", summary.game_id).order("created_at"),
  ]);
  if (!game) {
    return null;
  }
  return {
    ...summary,
    ...game,
    opening_moves: Array.isArray(game.opening_moves) ? game.opening_moves : summary.opening_moves,
    detail_available: true,
    moves: moves ?? [],
    errors: errors ?? [],
  } as GameDetail;
}
