from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "results" / "competition.sqlite3"
DEFAULT_LEADERBOARD = ROOT / "results" / "elo_leaderboard.json"
DEFAULT_OUT = APP_ROOT / "public" / "data"

PROVIDER_LOGOS = {
    "anthropic": "/assets/anthropic.svg",
    "deepseek": "/assets/deepseek.svg",
    "gemini": "/assets/gemini.svg",
    "kimi": "/assets/kimi.svg",
    "megalodon": "/assets/megalodon.svg",
    "moonshot": "/assets/kimi.svg",
    "openai": "/assets/openai.svg",
}

PROVIDER_ACCENTS = {
    "anthropic": "#e6d4ba",
    "deepseek": "#55b6ff",
    "gemini": "#7ee7c7",
    "kimi": "#f3d36b",
    "megalodon": "#d9f99d",
    "moonshot": "#f3d36b",
    "openai": "#70e6a4",
    "stockfish": "#c3cad7",
}

RESULT_SCORES = {
    "1-0": (1.0, 0.0),
    "0-1": (0.0, 1.0),
    "1/2-1/2": (0.5, 0.5),
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export compact ChessBench web data.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--leaderboard", type=Path, default=DEFAULT_LEADERBOARD)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--detail-limit", type=int, default=240)
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(f"Competition database not found: {args.db}")
    if not args.leaderboard.exists():
        raise SystemExit(f"ELO leaderboard not found: {args.leaderboard}")

    db = sqlite3.connect(args.db)
    db.row_factory = sqlite3.Row
    try:
        raw_engines, raw_to_canonical = load_engines(db)
        leaderboard_payload = json.loads(args.leaderboard.read_text(encoding="utf-8"))
        leaderboard = enrich_leaderboard(leaderboard_payload.get("leaderboard", []), raw_engines)
        games = load_game_summaries(db, raw_to_canonical)
        summary = build_summary(db, raw_engines, games, leaderboard, leaderboard_payload)
        site_payload = {
            "generated_at": datetime.now(UTC).isoformat(),
            "source_generated_at": leaderboard_payload.get("generated_at"),
            "summary": summary,
            "leaderboard": leaderboard,
            "models": build_models(leaderboard, raw_engines),
            "rating_bands": build_rating_bands(leaderboard),
            "recent_games": games[:24],
        }

        write_json(args.out / "site.json", site_payload)
        write_json(args.out / "games-index.json", games)
        write_game_details(db, args.out / "games", games[: max(0, args.detail_limit)], raw_to_canonical)
    finally:
        db.close()

    print(
        f"Exported {len(leaderboard)} leaderboard rows and {len(games)} game summaries "
        f"to {args.out.relative_to(APP_ROOT)}"
    )


def rows(db: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(sql, params).fetchall()]


def load_engines(db: sqlite3.Connection) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    raw_rows = rows(
        db,
        """
        SELECT engine_id, name, provider_model, run_id, root, command_json, manifest_json, first_seen_at, last_seen_at
        FROM engines
        ORDER BY name, last_seen_at DESC
        """,
    )
    raw_engines: dict[str, dict[str, Any]] = {}
    raw_to_canonical: dict[str, str] = {}
    for engine in raw_rows:
        manifest = compact_json(engine.get("manifest_json"))
        command = compact_json(engine.get("command_json"))
        provider = None
        model = None
        compile_ok = None
        if isinstance(manifest, dict):
            provider = manifest.get("provider")
            model = manifest.get("model")
            compile_ok = manifest.get("compile_ok")
        provider = provider or infer_provider(engine["provider_model"])
        raw_engines[engine["engine_id"]] = {
            "raw_engine_id": engine["engine_id"],
            "engine_id": engine["name"],
            "name": engine["name"],
            "provider": provider,
            "provider_model": engine["provider_model"],
            "model": model or engine["provider_model"],
            "run_id": engine["run_id"],
            "root": engine["root"],
            "command": command,
            "manifest": manifest,
            "compile_ok": compile_ok,
            "first_seen_at": engine["first_seen_at"],
            "last_seen_at": engine["last_seen_at"],
            "label": model_label(engine["name"]),
            "logo": PROVIDER_LOGOS.get(provider or ""),
            "accent": PROVIDER_ACCENTS.get(provider or "", "#70e6a4"),
        }
        raw_to_canonical[engine["engine_id"]] = engine["name"]
    return raw_engines, raw_to_canonical


def enrich_leaderboard(entries: list[dict[str, Any]], raw_engines: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    canonical_meta: dict[str, dict[str, Any]] = {}
    for engine in raw_engines.values():
        canonical_meta.setdefault(engine["engine_id"], engine)

    enriched = []
    for row in entries:
        meta = canonical_meta.get(row["engine_id"]) or canonical_meta.get(row["name"]) or {}
        provider = meta.get("provider") or infer_provider(row.get("provider_model", ""))
        enriched.append(
            {
                **row,
                "provider": provider,
                "model": meta.get("model") or row.get("provider_model"),
                "label": model_label(row.get("name", row.get("engine_id", ""))),
                "logo": PROVIDER_LOGOS.get(provider or ""),
                "accent": PROVIDER_ACCENTS.get(provider or "", "#70e6a4"),
            }
        )
    return enriched


def build_models(leaderboard: list[dict[str, Any]], raw_engines: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    canonical_meta: dict[str, dict[str, Any]] = {}
    for engine in raw_engines.values():
        canonical_meta.setdefault(engine["engine_id"], engine)

    models = []
    for row in leaderboard:
        meta = canonical_meta.get(row["engine_id"], {})
        models.append(
            {
                "engine_id": row["engine_id"],
                "name": row["name"],
                "label": row["label"],
                "provider": row["provider"],
                "provider_model": row["provider_model"],
                "model": row.get("model") or meta.get("model"),
                "rank": row["rank"],
                "elo": row["elo"],
                "games": row["games"],
                "score_pct": row["score_pct"],
                "logo": row.get("logo"),
                "accent": row.get("accent"),
            }
        )
    return models


def load_game_summaries(db: sqlite3.Connection, raw_to_canonical: dict[str, str]) -> list[dict[str, Any]]:
    game_rows = rows(
        db,
        """
        SELECT
            g.game_id,
            g.white_engine_id AS white_raw_engine_id,
            white.name AS white_name,
            white.provider_model AS white_provider_model,
            g.black_engine_id AS black_raw_engine_id,
            black.name AS black_name,
            black.provider_model AS black_provider_model,
            g.scheduled_at,
            g.started_at,
            g.finished_at,
            g.status,
            g.result,
            g.reason,
            g.opening_moves,
            g.opening_fen,
            g.opening_source,
            g.opening_skip_reason,
            g.result_source,
            g.forfeiting_engine_id AS forfeiting_raw_engine_id,
            g.migration_note,
            g.white_clock_ms,
            g.black_clock_ms,
            (SELECT COUNT(*) FROM moves WHERE moves.game_id = g.game_id) AS plies,
            (SELECT ROUND(AVG(elapsed_ms), 1) FROM moves WHERE moves.game_id = g.game_id AND elapsed_ms IS NOT NULL) AS avg_elapsed_ms
        FROM games g
        JOIN engines white ON white.engine_id = g.white_engine_id
        JOIN engines black ON black.engine_id = g.black_engine_id
        WHERE g.status != 'ignored'
        ORDER BY COALESCE(g.finished_at, g.started_at, g.scheduled_at) DESC
        """,
    )

    summaries = []
    for game in game_rows:
        white = raw_to_canonical.get(game["white_raw_engine_id"], game["white_name"])
        black = raw_to_canonical.get(game["black_raw_engine_id"], game["black_name"])
        forfeiting = (
            raw_to_canonical.get(game["forfeiting_raw_engine_id"], game["forfeiting_raw_engine_id"])
            if game.get("forfeiting_raw_engine_id")
            else None
        )
        winner = winner_for_result(game.get("result"), white, black)
        opening_moves = split_moves(game.get("opening_moves"))
        summaries.append(
            {
                "game_id": game["game_id"],
                "white_engine_id": white,
                "black_engine_id": black,
                "white_raw_engine_id": game["white_raw_engine_id"],
                "black_raw_engine_id": game["black_raw_engine_id"],
                "white_name": white,
                "black_name": black,
                "white_label": model_label(white),
                "black_label": model_label(black),
                "white_provider": infer_provider(game["white_provider_model"]),
                "black_provider": infer_provider(game["black_provider_model"]),
                "scheduled_at": game["scheduled_at"],
                "started_at": game["started_at"],
                "finished_at": game["finished_at"],
                "status": game["status"],
                "result": game["result"],
                "reason": game["reason"],
                "result_source": game["result_source"],
                "winner_engine_id": winner,
                "forfeiting_engine_id": forfeiting,
                "migration_note": game["migration_note"],
                "opening_moves": opening_moves,
                "opening_label": opening_label(opening_moves),
                "opening_fen": game["opening_fen"],
                "opening_source": game["opening_source"],
                "opening_skip_reason": game["opening_skip_reason"],
                "white_clock_ms": game["white_clock_ms"],
                "black_clock_ms": game["black_clock_ms"],
                "plies": int(game["plies"] or 0),
                "avg_elapsed_ms": game["avg_elapsed_ms"],
                "is_draw": game["result"] == "1/2-1/2",
                "is_forfeit": "forfeit" in (game.get("result_source") or "") or "engine error" in (game.get("reason") or ""),
                "detail_available": False,
            }
        )
    return summaries


def write_game_details(
    db: sqlite3.Connection,
    details_dir: Path,
    games: list[dict[str, Any]],
    raw_to_canonical: dict[str, str],
) -> None:
    details_dir.mkdir(parents=True, exist_ok=True)
    for stale in details_dir.glob("*.json"):
        stale.unlink()

    for game in games:
        detail = dict(game)
        detail["detail_available"] = True
        row = db.execute(
            """
            SELECT pgn, config_json, time_control_json
            FROM games
            WHERE game_id = ?
            """,
            (game["game_id"],),
        ).fetchone()
        detail["pgn"] = row["pgn"] if row else None
        detail["config"] = compact_json(row["config_json"]) if row else None
        detail["time_control"] = compact_json(row["time_control_json"]) if row else None
        detail["moves"] = [
            {
                **move,
                "engine_id": raw_to_canonical.get(move["engine_id"], move["engine_id"]),
                "raw_engine_id": move["engine_id"],
            }
            for move in rows(
                db,
                """
                SELECT ply, engine_id, move_uci, fen_before, fen_after, elapsed_ms, clock_ms, created_at
                FROM moves
                WHERE game_id = ?
                ORDER BY ply
                """,
                (game["game_id"],),
            )
        ]
        detail["errors"] = [
            {
                **error,
                "engine_id": raw_to_canonical.get(error["engine_id"], error["engine_id"]) if error["engine_id"] else None,
                "raw_engine_id": error["engine_id"],
            }
            for error in rows(
                db,
                """
                SELECT engine_id, message, created_at
                FROM game_errors
                WHERE game_id = ?
                ORDER BY id
                """,
                (game["game_id"],),
            )
        ]
        write_json(details_dir / f"{game['game_id']}.json", detail)
        game["detail_available"] = True


def build_summary(
    db: sqlite3.Connection,
    raw_engines: dict[str, dict[str, Any]],
    games: list[dict[str, Any]],
    leaderboard: list[dict[str, Any]],
    leaderboard_payload: dict[str, Any],
) -> dict[str, Any]:
    aggregate = dict(
        db.execute(
            """
            SELECT
                COUNT(*) AS total_games,
                SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS finished_games,
                SUM(CASE WHEN result = '1/2-1/2' THEN 1 ELSE 0 END) AS draws,
                MIN(finished_at) AS first_finished_at,
                MAX(finished_at) AS latest_finished_at
            FROM games
            WHERE status != 'ignored'
            """
        ).fetchone()
    )
    moves = db.execute("SELECT COUNT(*) FROM moves").fetchone()[0]
    forfeits = sum(1 for game in games if game["is_forfeit"])
    return {
        "total_games": int(aggregate["total_games"] or 0),
        "finished_games": int(aggregate["finished_games"] or 0),
        "draws": int(aggregate["draws"] or 0),
        "forfeits": forfeits,
        "moves": int(moves or 0),
        "models": len(leaderboard),
        "raw_engines": len(raw_engines),
        "top_elo": leaderboard[0]["elo"] if leaderboard else None,
        "top_model": leaderboard[0]["label"] if leaderboard else None,
        "first_finished_at": aggregate["first_finished_at"],
        "latest_finished_at": aggregate["latest_finished_at"],
        "elo_generated_at": leaderboard_payload.get("generated_at"),
        "anchor_count": len(leaderboard_payload.get("anchors") or {}),
    }


def build_rating_bands(leaderboard: list[dict[str, Any]]) -> list[dict[str, Any]]:
    bands = [
        ("2400+", 2400, 9999),
        ("2000-2399", 2000, 2399),
        ("1600-1999", 1600, 1999),
        ("1200-1599", 1200, 1599),
        ("<1200", -9999, 1199),
    ]
    return [
        {
            "label": label,
            "count": sum(1 for row in leaderboard if low <= row["elo"] <= high),
        }
        for label, low, high in bands
    ]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def compact_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def infer_provider(provider_model: str | None) -> str:
    value = (provider_model or "").lower()
    for provider in ("openai", "anthropic", "gemini", "deepseek", "kimi", "moonshot", "megalodon", "stockfish"):
        if value.startswith(provider):
            return "kimi" if provider == "moonshot" else provider
    return value.split("-", 1)[0] if value else "unknown"


def model_label(name: str) -> str:
    value = name.rsplit("/", 1)[0]
    for prefix in ("anthropic-", "openai-", "gemini-", "deepseek-", "kimi-", "moonshot-"):
        if value.startswith(prefix):
            value = value[len(prefix) :]
            break
    return value.replace("-", " ").replace("gpt ", "GPT-").replace("GPT-5", "GPT-5").title().replace("Gpt", "GPT")


def split_moves(value: str | None) -> list[str]:
    return [move for move in (value or "").split() if move]


def opening_label(moves: list[str]) -> str:
    if not moves:
        return "Start position"
    return " ".join(moves[:6]) + (" ..." if len(moves) > 6 else "")


def winner_for_result(result: str | None, white: str, black: str) -> str | None:
    if result == "1-0":
        return white
    if result == "0-1":
        return black
    return None


if __name__ == "__main__":
    main()
