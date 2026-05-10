from __future__ import annotations

import chess

from competition.models import Engine, TimeControl
from competition.uci import UciEngine


def probe_opening_support(engine: Engine, timeout_seconds: float = 5.0) -> tuple[bool, str]:
    board = chess.Board()
    for move_text in ("e2e4", "e7e5", "g1f3", "b8c6"):
        board.push(chess.Move.from_uci(move_text))

    uci = UciEngine(engine.command, engine.root, lambda _direction, _line: None)
    try:
        uci.start()
        uci.initialize(timeout_seconds)
        uci.send("ucinewgame")
        uci.send("isready")
        uci.wait_for("readyok", timeout_seconds)
        uci.send(f"position fen {board.fen()}")
        uci.send(TimeControl(movetime_ms=25).go_command(None, None))
        bestmove, _elapsed_ms = uci.wait_bestmove(timeout_seconds)
        move = chess.Move.from_uci(bestmove)
        if move not in board.legal_moves:
            return False, f"probe returned illegal move {bestmove} from non-start FEN"
        return True, f"probe returned legal move {bestmove} from non-start FEN"
    except Exception as exc:
        return False, f"probe failed: {exc}"
    finally:
        uci.stop()
