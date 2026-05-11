from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


DEFAULT_DB = Path("results/competition.sqlite3")


@dataclass(frozen=True)
class MergeSummary:
    engine_rows_before: int
    engine_rows_after: int
    merged_ids: int


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Merge duplicate raw engine ids into one canonical id per engine name.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if not args.db.exists():
        raise SystemExit(f"competition database not found: {args.db}")

    summary = merge_engine_ids(args.db, dry_run=args.dry_run)
    action = "would merge" if args.dry_run else "merged"
    print(
        f"{action} {summary.merged_ids} engine id(s); "
        f"engines {summary.engine_rows_before} -> {summary.engine_rows_after}"
    )
    return 0


def merge_engine_ids(db_path: Path, dry_run: bool = False) -> MergeSummary:
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    try:
        rows = db.execute(
            """
            SELECT engine_id, name, provider_model, run_id, root, command_json, manifest_json, first_seen_at, last_seen_at
            FROM engines
            ORDER BY name, last_seen_at DESC, engine_id
            """
        ).fetchall()
        before = len(rows)
        canonical_by_id = {row["engine_id"]: row["name"] for row in rows}
        merged = sum(1 for raw_id, canonical_id in canonical_by_id.items() if raw_id != canonical_id)
        after = len({row["name"] for row in rows})

        if dry_run or merged == 0:
            return MergeSummary(before, after, merged)

        capability_rows = _canonical_capabilities(db, canonical_by_id)
        standings_rows = _canonical_standings(db, canonical_by_id)

        db.execute("PRAGMA foreign_keys=OFF")
        db.execute("BEGIN")
        try:
            for row in _canonical_engine_rows(rows):
                db.execute(
                    """
                    INSERT INTO engines(
                      engine_id, name, provider_model, run_id, root, command_json, manifest_json, first_seen_at, last_seen_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(engine_id) DO UPDATE SET
                      name=excluded.name,
                      provider_model=excluded.provider_model,
                      run_id=excluded.run_id,
                      root=excluded.root,
                      command_json=excluded.command_json,
                      manifest_json=excluded.manifest_json,
                      first_seen_at=excluded.first_seen_at,
                      last_seen_at=excluded.last_seen_at
                    """,
                    (
                        row["name"],
                        row["name"],
                        row["provider_model"],
                        row["run_id"],
                        row["root"],
                        row["command_json"],
                        row["manifest_json"],
                        row["first_seen_at"],
                        row["last_seen_at"],
                    ),
                )

            _rewrite_table_ids(db, "games", "white_engine_id", canonical_by_id)
            _rewrite_table_ids(db, "games", "black_engine_id", canonical_by_id)
            _rewrite_table_ids(db, "games", "forfeiting_engine_id", canonical_by_id)
            _rewrite_table_ids(db, "moves", "engine_id", canonical_by_id)
            _rewrite_table_ids(db, "game_errors", "engine_id", canonical_by_id)
            _rewrite_table_ids(db, "uci_events", "engine_id", canonical_by_id)

            db.execute("DELETE FROM engine_capabilities")
            db.executemany(
                """
                INSERT INTO engine_capabilities(engine_id, supports_openings, reason, checked_at)
                VALUES (?, ?, ?, ?)
                """,
                capability_rows,
            )

            db.execute("DELETE FROM standings")
            db.executemany(
                """
                INSERT INTO standings(engine_id, games, wins, losses, draws, score, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                standings_rows,
            )

            db.executemany(
                "DELETE FROM engines WHERE engine_id=?",
                [(row["engine_id"],) for row in rows if row["engine_id"] != row["name"]],
            )
            db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_engines_name_unique ON engines(name)")
            db.execute("COMMIT")
        except Exception:
            db.execute("ROLLBACK")
            raise
        finally:
            db.execute("PRAGMA foreign_keys=ON")
        return MergeSummary(before, after, merged)
    finally:
        db.close()


def _canonical_engine_rows(rows: list[sqlite3.Row]) -> list[sqlite3.Row]:
    by_name: dict[str, sqlite3.Row] = {}
    for row in rows:
        by_name.setdefault(row["name"], row)
    return list(by_name.values())


def _rewrite_table_ids(db: sqlite3.Connection, table: str, column: str, canonical_by_id: dict[str, str]) -> None:
    for raw_id, canonical_id in canonical_by_id.items():
        if raw_id == canonical_id:
            continue
        db.execute(f"UPDATE {table} SET {column}=? WHERE {column}=?", (canonical_id, raw_id))


def _canonical_capabilities(db: sqlite3.Connection, canonical_by_id: dict[str, str]) -> list[tuple[str, int, str, str]]:
    rows = db.execute(
        """
        SELECT engine_id, supports_openings, reason, checked_at
        FROM engine_capabilities
        ORDER BY checked_at DESC
        """
    ).fetchall()
    selected: dict[str, sqlite3.Row] = {}
    for row in rows:
        canonical_id = canonical_by_id.get(row["engine_id"], row["engine_id"])
        selected.setdefault(canonical_id, row)
    return [(engine_id, row["supports_openings"], row["reason"], row["checked_at"]) for engine_id, row in selected.items()]


def _canonical_standings(db: sqlite3.Connection, canonical_by_id: dict[str, str]) -> list[tuple[str, int, int, int, int, float, str]]:
    rows = db.execute(
        """
        SELECT engine_id, games, wins, losses, draws, score, updated_at
        FROM standings
        ORDER BY updated_at DESC
        """
    ).fetchall()
    merged: dict[str, dict[str, object]] = {}
    for row in rows:
        canonical_id = canonical_by_id.get(row["engine_id"], row["engine_id"])
        item = merged.setdefault(
            canonical_id,
            {"games": 0, "wins": 0, "losses": 0, "draws": 0, "score": 0.0, "updated_at": row["updated_at"]},
        )
        item["games"] = int(item["games"]) + int(row["games"])
        item["wins"] = int(item["wins"]) + int(row["wins"])
        item["losses"] = int(item["losses"]) + int(row["losses"])
        item["draws"] = int(item["draws"]) + int(row["draws"])
        item["score"] = float(item["score"]) + float(row["score"])
        item["updated_at"] = max(str(item["updated_at"]), row["updated_at"])
    return [
        (
            engine_id,
            int(item["games"]),
            int(item["wins"]),
            int(item["losses"]),
            int(item["draws"]),
            float(item["score"]),
            str(item["updated_at"]),
        )
        for engine_id, item in merged.items()
    ]


if __name__ == "__main__":
    raise SystemExit(main())
