"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, BadgeAlert, ChevronDown, Filter, Search, Shield, X } from "lucide-react";

import { GameReplay } from "@/components/GameReplay";
import { fetchGameDetail, fetchGames, fetchLeaderboard } from "@/core/benchmark-api";
import { durationLabel, formatInteger, gameHeadline, modelLabel, resultLabel } from "@/core/format";
import { hasSupabaseConfig } from "@/core/supabase";
import type { GameDetail, GameSummary, LeaderboardRow } from "@/core/types";

const PAGE_SIZE = 50;

export function GamesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = hasSupabaseConfig();
  const [models, setModels] = useState<LeaderboardRow[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [modelFilter, setModelFilter] = useState(searchParams.get("model") ?? "all");
  const [resultFilter, setResultFilter] = useState(searchParams.get("result") ?? "all");
  const [selectedId, setSelectedId] = useState(searchParams.get("game") ?? "");
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filters = useMemo(
    () => ({ search: query, model: modelFilter, result: resultFilter, limit: PAGE_SIZE }),
    [modelFilter, query, resultFilter],
  );

  const loadFirstPage = useCallback(() => {
    if (!configured) return;
    setLoading(true);
    setError("");
    Promise.all([fetchLeaderboard(), fetchGames({ ...filters, offset: 0 })])
      .then(([rows, payload]) => {
        setModels(rows);
        setGames(payload.games);
        setTotal(payload.count);
        setSelectedId((current) => current || payload.games[0]?.game_id || "");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [configured, filters]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    if (!configured || !selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchGameDetail(selectedId)
      .then(setDetail)
      .catch((err: Error) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }, [configured, selectedId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !configured) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || loading || games.length >= total) return;
        setLoading(true);
        fetchGames({ ...filters, offset: games.length })
          .then((payload) => {
            setGames((current) => [...current, ...payload.games]);
            setTotal(payload.count);
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setLoading(false));
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [configured, filters, games.length, loading, total]);

  const updateUrl = useCallback(
    (next: { game?: string; model?: string; result?: string; q?: string }) => {
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

  const clearFilters = () => {
    setQuery("");
    setModelFilter("all");
    setResultFilter("all");
    router.replace("/games/", { scroll: false });
  };

  if (!configured) {
    return (
      <section className="games-shell">
        <div className="games-toolbar">
          <div>
            <p className="eyebrow">Game archive</p>
            <h1>Supabase required</h1>
          </div>
        </div>
        <div className="setup-notice large">
          This page intentionally has no bundled local game data. Create the Supabase project, run
          `benchmark/supabase/schema.sql`, sync with `uv run llm-chess sync-supabase`, and set the public Supabase env
          vars to enable the archive.
        </div>
      </section>
    );
  }

  return (
    <section className="games-shell">
      <div className="games-toolbar">
        <div>
          <p className="eyebrow">Game archive</p>
          <h1>{formatInteger(total)} games</h1>
        </div>
        <div className="toolbar-actions">
          <span className="source-pill">
            <Shield size={15} /> Supabase API
          </span>
          <button className="icon-text-button" onClick={clearFilters}>
            <X size={16} /> Clear filters
          </button>
        </div>
      </div>

      {error && <div className="setup-notice error">{error}</div>}

      <div className="games-layout expanded">
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
                placeholder="Search games, models, reasons"
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
                {models.map((model) => (
                  <option key={model.engine_id} value={model.engine_id}>
                    {modelLabel(model)}
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
                  setResultFilter(event.target.value);
                  startTransition(() => updateUrl({ result: event.target.value }));
                }}
              >
                <option value="all">All results</option>
                <option value="decisive">Decisive</option>
                <option value="draws">Draws</option>
                <option value="forfeits">Forfeits</option>
              </select>
              <ChevronDown size={16} />
            </label>
          </div>

          <div className="game-list-header">
            <span>{loading || isPending ? "Loading" : `Loaded ${formatInteger(games.length)}`}</span>
            <span>{formatInteger(total)} matches</span>
          </div>

          <div className="game-list-stream">
            {games.map((game) => (
              <button
                className={`game-row ${selectedId === game.game_id ? "active" : ""}`}
                key={game.game_id}
                onClick={() => {
                  setSelectedId(game.game_id);
                  startTransition(() => updateUrl({ game: game.game_id }));
                }}
              >
                <span className={`result-pill ${game.result === "1/2-1/2" ? "draw" : game.result_source?.includes("forfeit") ? "forfeit" : "decisive"}`}>
                  {resultLabel(game.result)}
                </span>
                <span className="game-row-main">
                  <strong>
                    {modelLabel({ name: game.white_name, provider_model: game.white_provider_model })} <em>vs</em>{" "}
                    {modelLabel({ name: game.black_name, provider_model: game.black_provider_model })}
                  </strong>
                  <small>{gameHeadline(game)}</small>
                </span>
                <span className="game-row-meta">
                  <span>{formatInteger(game.plies)} plies</span>
                  <span>{durationLabel(game.avg_elapsed_ms)}</span>
                </span>
              </button>
            ))}
            {!loading && games.length === 0 && (
              <div className="empty-list">
                <BadgeAlert size={26} />
                <span>No games match those filters.</span>
              </div>
            )}
            <div ref={sentinelRef} className="scroll-sentinel" />
          </div>
        </aside>

        <section className="game-detail-stage">{detail ? <GameReplay detail={detail} models={models} loading={detailLoading} /> : null}</section>
      </div>
    </section>
  );
}
