from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "results" / "competition.sqlite3"
DEFAULT_OUT = APP_ROOT / "public" / "data" / "competition.json"


def compact_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def rows(db: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(sql, params).fetchall()]


def main() -> None:
    db_path = Path(DEFAULT_DB)
    out_path = Path(DEFAULT_OUT)
    if not db_path.exists():
        raise SystemExit(f"Competition database not found: {db_path}")

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    engines = rows(
        db,
        """
        SELECT engine_id, name, provider_model, run_id, root, manifest_json, first_seen_at, last_seen_at
        FROM engines
        ORDER BY name
        """,
    )
    for engine in engines:
        manifest = compact_json(engine.pop("manifest_json"))
        engine["compile_ok"] = manifest.get("compile_ok") if isinstance(manifest, dict) else None
        engine["provider"] = manifest.get("provider") if isinstance(manifest, dict) else None
        engine["model"] = manifest.get("model") if isinstance(manifest, dict) else engine["provider_model"]

    standings = rows(
        db,
        """
        SELECT s.engine_id, e.name, e.provider_model, s.games, s.wins, s.losses, s.draws, s.score, s.updated_at
        FROM standings s
        JOIN engines e ON e.engine_id = s.engine_id
        ORDER BY s.score DESC, s.wins DESC, s.draws DESC, e.name
        """,
    )

    games = rows(
        db,
        """
        SELECT
            g.game_id, g.white_engine_id, g.black_engine_id,
            white.name AS white_name, black.name AS black_name,
            g.scheduled_at, g.started_at, g.finished_at, g.status, g.result, g.reason,
            g.pgn, g.time_control_json, g.opening_moves, g.opening_fen, g.opening_source,
            g.opening_skip_reason, g.white_clock_ms, g.black_clock_ms
        FROM games g
        JOIN engines white ON white.engine_id = g.white_engine_id
        JOIN engines black ON black.engine_id = g.black_engine_id
        ORDER BY COALESCE(g.finished_at, g.started_at, g.scheduled_at) DESC
        """,
    )

    game_ids = [game["game_id"] for game in games]
    moves_by_game: dict[str, list[dict[str, Any]]] = {game_id: [] for game_id in game_ids}
    for move in rows(
        db,
        """
        SELECT game_id, ply, engine_id, move_uci, fen_before, fen_after, elapsed_ms, clock_ms
        FROM moves
        ORDER BY game_id, ply
        """,
    ):
        moves_by_game.setdefault(move["game_id"], []).append(move)

    errors_by_game: dict[str, list[dict[str, Any]]] = {game_id: [] for game_id in game_ids}
    for error in rows(
        db,
        """
        SELECT game_id, engine_id, message, created_at
        FROM game_errors
        ORDER BY id
        """,
    ):
        errors_by_game.setdefault(error["game_id"], []).append(error)

    for game in games:
        game["time_control"] = compact_json(game.pop("time_control_json"))
        game["moves"] = moves_by_game.get(game["game_id"], [])
        game["errors"] = errors_by_game.get(game["game_id"], [])

    payload = {
        "exported_at": datetime.now(UTC).isoformat(),
        "source_db": str(db_path),
        "summary": {
            "engines": len(engines),
            "games": len(games),
            "moves": sum(len(game["moves"]) for game in games),
            "finished": sum(1 for game in games if game["status"] == "finished"),
            "failed": sum(1 for game in games if game["status"] == "failed"),
        },
        "engines": engines,
        "standings": standings,
        "games": games,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Exported {len(games)} games to {out_path}")


if __name__ == "__main__":
    main()
