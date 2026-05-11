from __future__ import annotations

import argparse
import shutil
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "results" / "competition.sqlite3"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Backfill materialized game ply stats in a ChessBench SQLite results database.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args(argv)

    if not args.db.exists():
        raise SystemExit(f"Competition database not found: {args.db}")

    if not args.no_backup:
        stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
        backup = args.db.with_name(f"{args.db.name}.bak-game-stats-{stamp}")
        shutil.copy2(args.db, backup)
        print(f"Created backup: {backup}")

    db = sqlite3.connect(args.db)
    try:
        ensure_column(db, "games", "plies", "INTEGER NOT NULL DEFAULT 0")
        ensure_column(db, "games", "avg_elapsed_ms", "REAL")
        db.execute(
            """
            UPDATE games
            SET
                plies = (
                    SELECT COUNT(*)
                    FROM moves
                    WHERE moves.game_id = games.game_id
                ),
                avg_elapsed_ms = (
                    SELECT ROUND(AVG(elapsed_ms), 1)
                    FROM moves
                    WHERE moves.game_id = games.game_id
                )
            """
        )
        db.commit()
    finally:
        db.close()

    print(f"Backfilled game stats in {args.db}")
    return 0


def ensure_column(db: sqlite3.Connection, table: str, name: str, kind: str) -> None:
    columns = {row[1] for row in db.execute(f"PRAGMA table_info({table})")}
    if name not in columns:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {kind}")


if __name__ == "__main__":
    raise SystemExit(main())
