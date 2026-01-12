import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Chess } from "chess.js";

// AI ENGINE IMPORT
import { findBestMove } from "./engine/engine.js";

// -------------------------------------------
// Piece Assets
// -------------------------------------------
const pieceMap = {
  wp: new URL("./assets/pieces/wp.svg", import.meta.url).href,
  wr: new URL("./assets/pieces/wr.svg", import.meta.url).href,
  wn: new URL("./assets/pieces/wn.svg", import.meta.url).href,
  wb: new URL("./assets/pieces/wb.svg", import.meta.url).href,
  wq: new URL("./assets/pieces/wq.svg", import.meta.url).href,
  wk: new URL("./assets/pieces/wk.svg", import.meta.url).href,

  bp: new URL("./assets/pieces/bp.svg", import.meta.url).href,
  br: new URL("./assets/pieces/br.svg", import.meta.url).href,
  bn: new URL("./assets/pieces/bn.svg", import.meta.url).href,
  bb: new URL("./assets/pieces/bb.svg", import.meta.url).href,
  bq: new URL("./assets/pieces/bq.svg", import.meta.url).href,
  bk: new URL("./assets/pieces/bk.svg", import.meta.url).href,
};

const retroFont = {
  fontFamily: "'VT323', monospace",
  letterSpacing: "0.5px",
};

// -------------------------------------------
const coord = (r, c) => `${String.fromCharCode(97 + c)}${8 - r}`;

// -------------------------------------------
// MAIN COMPONENT
// -------------------------------------------
export default function ChessApp() {
  const STORAGE_KEY = "chess-ai-save-v1";

  const gameRef = useRef(new Chess());
  const timerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const [theme, setTheme] = useState("dark");

  const [board, setBoard] = useState(gameRef.current.board());
  const [turn, setTurn] = useState("w");

  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // WhiteCaptured = pieces computer captured from me
  // BlackCaptured = pieces I captured from computer
  const [whiteCaptured, setWhiteCaptured] = useState([]);
  const [blackCaptured, setBlackCaptured] = useState([]);

  const [moveList, setMoveList] = useState([]);

  const [gameStatus, setGameStatus] = useState("paused"); // "paused" | "running"
  const [gameResult, setGameResult] = useState("");

  // Timers (5 min)
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [difficulty, setDifficulty] = useState("moderate");

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const DIFFICULTY_SETTINGS = {
    beginner: { label: "Beginner", thinkMs: [1200, 2200] },
    moderate: { label: "Moderate", thinkMs: [1800, 2800] },
    advanced: { label: "Advanced", thinkMs: [2400, 3800] },
  };

  const refresh = () => setBoard(gameRef.current.board());
  const resetSelection = () => {
    setSelected(null);
    setLegalMoves([]);
  };

  const getAIMoveSafe = () => {
    try {
      return findBestMove(gameRef.current, difficulty);
    } catch (err) {
      console.error("Advanced search failed, falling back to moderate", err);
      if (difficulty !== "moderate") {
        try {
          return findBestMove(gameRef.current, "moderate");
        } catch (err2) {
          console.error("Fallback search failed", err2);
        }
      }
      return null;
    }
  };

  const endGame = (message) => {
    setGameResult(message);
    setGameStatus("paused");
  };

  const checkGameOverState = () => {
    const game = gameRef.current;
    if (whiteTime <= 0) {
      endGame("Time out: White loses.");
      return true;
    }
    if (blackTime <= 0) {
      endGame("Time out: Black loses.");
      return true;
    }
    if (game.isCheckmate()) {
      const loser = game.turn() === "w" ? "White" : "Black";
      const winner = loser === "White" ? "Black" : "White";
      endGame(`Checkmate! ${winner} wins.`);
      return true;
    }
    if (game.isDraw()) {
      endGame("Draw.");
      return true;
    }
    return false;
  };

  const isRunning = gameStatus === "running";
  const hasSession =
    gameStatus === "running" ||
    moveList.length > 0 ||
    whiteCaptured.length > 0 ||
    blackCaptured.length > 0 ||
    whiteTime !== 300 ||
    blackTime !== 300 ||
    gameRef.current.fen() !== new Chess().fen();
  const resetDisabled = !(hasSession || isRunning);

  // -------------------------------------------
  // SAVE / LOAD / RESTART
  // -------------------------------------------
  const saveState = () => {
    const game = gameRef.current;

    const payload = {
      fen: game.fen(),
      turn,
      whiteCaptured,
      blackCaptured,
      moveList,
      lastMove, // we only use from/to for highlight; safe to persist
      whiteTime,
      blackTime,
      gameStatus,
      difficulty,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const resetGame = () => {
    gameRef.current = new Chess();
    setBoard(gameRef.current.board());
    setTurn("w");

    setSelected(null);
    setLegalMoves([]);
    setLastMove(null);

    setWhiteCaptured([]);
    setBlackCaptured([]);
    setMoveList([]);

    setWhiteTime(300);
    setBlackTime(300);

    setGameStatus("paused");
    setGameResult("");

    localStorage.removeItem(STORAGE_KEY);
  };

  // -------------------------------------------
  // RESET ON LOAD (treat refresh as reset)
  // -------------------------------------------
  useEffect(() => {
    resetGame();
    hasLoadedRef.current = true;
  }, []);

  // -------------------------------------------
  // -------------------------------------------
  // AUTO-SAVE (after initial load)
  // -------------------------------------------
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, whiteCaptured, blackCaptured, moveList, lastMove, whiteTime, blackTime, gameStatus, difficulty]);

  // -------------------------------------------
  // GLOBAL CHESS CLOCK (ticks only when running)
  // -------------------------------------------
  useEffect(() => {
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const g = gameRef.current;
      if (gameStatus !== "running") return;
      if (g.isGameOver()) return;

      const side = g.turn(); // pull from chess.js
      if (side === "w") setWhiteTime((t) => Math.max(t - 1, 0));
      else setBlackTime((t) => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameStatus]);

  useEffect(() => {
    if (!isRunning) return;
    if (whiteTime <= 0) {
      setWhiteTime(0);
      endGame("Time out: White loses.");
    }
  }, [whiteTime, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (blackTime <= 0) {
      setBlackTime(0);
      endGame("Time out: Black loses.");
    }
  }, [blackTime, isRunning]);

  // Ensure latest clock is saved before unload
  useEffect(() => {
    const handler = () => saveState();
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("visibilitychange", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------
  // USER CLICK HANDLING
  // -------------------------------------------
  const handleClick = (r, c) => {
    const game = gameRef.current;

    if (gameStatus !== "running") return;
    if (turn !== "w" || game.isGameOver()) return;

    const square = coord(r, c);
    const piece = game.get(square);

    if (!selected) {
      if (piece && piece.color === "w") {
        setSelected(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => m.to));
      }
      return;
    }

    if (selected === square) {
      resetSelection();
      return;
    }

    // Re-select a different white piece
    if (piece && piece.color === "w" && !legalMoves.includes(square)) {
      setSelected(square);
      const moves = game.moves({ square, verbose: true });
      setLegalMoves(moves.map((m) => m.to));
      return;
    }

    if (legalMoves.includes(square)) {
      const mv = game.move({ from: selected, to: square, promotion: "q" });

      if (mv) {
        if (mv.captured) {
          const key = (mv.color === "w" ? "b" : "w") + mv.captured;
          if (mv.color === "w") setBlackCaptured((a) => [...a, key]);
          else setWhiteCaptured((a) => [...a, key]);
        }

        setMoveList((list) => [...list, mv.san]);
        setLastMove(mv);
        refresh();
        resetSelection();
        if (!checkGameOverState()) {
          setTurn("b");
        }
      }
    } else {
      resetSelection();
    }
  };

  const isSelectedSquare = (r, c) => selected === coord(r, c);
  const isLastSquare = (r, c) =>
    lastMove && (lastMove.from === coord(r, c) || lastMove.to === coord(r, c));
  const isLegalTarget = (r, c) => legalMoves.includes(coord(r, c));

  // -------------------------------------------
  // COMPUTER MOVE
  // -------------------------------------------
  useEffect(() => {
    const game = gameRef.current;

    if (gameStatus !== "running") return;
    if (turn !== "b" || game.isGameOver()) return;

    const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.moderate;
    const [minThink, maxThink] = settings.thinkMs;
    const delay = Math.floor(Math.random() * (maxThink - minThink + 1)) + minThink;

    const t = setTimeout(() => {
      // If user paused while AI was thinking, bail
      if (gameStatus !== "running") return;

      const computeStart = performance.now();
      const mv = getAIMoveSafe();
      const computeElapsed = performance.now() - computeStart;
      if (computeElapsed > 500) {
        const extraSeconds = Math.max(1, Math.round(computeElapsed / 1000));
        setBlackTime((t) => Math.max(t - extraSeconds, 0));
      }
      if (!mv) {
        setTurn("w");
        return;
      }

      const result = game.move(mv);

      if (result?.captured) {
        const key = (result.color === "w" ? "b" : "w") + result.captured;
        if (result.color === "b") setWhiteCaptured((a) => [...a, key]);
        else setBlackCaptured((a) => [...a, key]);
      }

      setMoveList((m) => [...m, result.san]);
      setLastMove(result);
      refresh();
      resetSelection();
      if (!checkGameOverState()) {
        setTurn("w");
      }
    }, delay);

    return () => clearTimeout(t);
  }, [turn, gameStatus, difficulty]);

  // -------------------------------------------
  // Board Colors
  // -------------------------------------------
  const boardColors =
    theme === "dark"
      ? { light: "#F3F3F3", dark: "#4A4A4A" }
      : { light: "#f9fdff", dark: "#cdd9ec" };
  const highlightColors = {
    selected: "rgba(255,255,0,0.25)",
    last: "rgba(255,165,0,0.35)",
  };

  const whiteMoves = moveList.filter((_, idx) => idx % 2 === 0);
  const blackMoves = moveList.filter((_, idx) => idx % 2 === 1);

  const themeColors = {
    bg: theme === "dark" ? "#020617" : "#cfeaff",
    sidebarBg: theme === "dark" ? "#0a0f18" : "#e8f4ff",
    sidebarBorder: theme === "dark" ? "#1a2333" : "#c3daf2",
    text: theme === "dark" ? "text-slate-100" : "text-black",
    muted: theme === "dark" ? "text-gray-400" : "text-gray-700",
  };
  const textPrimary = theme === "dark" ? "text-gray-100" : "text-black";
  const textSecondary = theme === "dark" ? "text-gray-200" : "text-gray-800";
  const textMuted = theme === "dark" ? "text-gray-500" : "text-gray-600";

  // -------------------------------------------
  // RENDER
  // -------------------------------------------
  return (
    <div
      className={`min-h-screen w-full flex items-start justify-center p-6 gap-6 flex-wrap md:flex-nowrap ${themeColors.text}`}
      style={{ background: themeColors.bg }}
    >
      <button
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border border-slate-300/70 bg-white/90 text-slate-800 hover:bg-white transition"
        aria-label="Toggle theme"
      >
        <span className="text-lg">🌙</span>
        <div
          className={`w-14 h-7 rounded-full relative transition ${
            theme === "dark" ? "bg-slate-700" : "bg-yellow-300"
          }`}
        >
          <div
            className={`absolute top-[2px] left-[2px] h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
              theme === "light" ? "translate-x-7" : ""
            }`}
          />
        </div>
        <span className="text-lg">☀️</span>
      </button>
      {/* LEFT PANEL: Moves */}
      <div
        className={`w-full md:w-64 lg:w-72 p-4 rounded-2xl border shadow-xl max-h-[80vh] overflow-y-auto ${themeColors.text}`}
        style={{ ...retroFont, background: themeColors.sidebarBg, borderColor: themeColors.sidebarBorder }}
      >
        <div className={`${textPrimary} text-xl mb-3`}>Moves</div>
        {moveList.length === 0 && <div className={`${textMuted} text-sm`}>No moves yet.</div>}
        <div className={`grid grid-cols-2 gap-3 text-sm ${textSecondary}`}>
          <div>
            <div className={`${textMuted} text-xs mb-2`}>White</div>
            <div className="space-y-2">
              {whiteMoves.length === 0 && <div className={`${textMuted} text-xs`}>—</div>}
              {whiteMoves.map((m, i) => (
                <div key={`mv-left-w-${i}`} className="flex items-center gap-2">
                  <div className={`w-8 ${textMuted}`}>{i + 1}.</div>
                  <div className="flex-1">{m}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={`${textMuted} text-xs mb-2`}>Black</div>
            <div className="space-y-2">
              {blackMoves.length === 0 && <div className={`${textMuted} text-xs`}>—</div>}
              {blackMoves.map((m, i) => (
                <div key={`mv-left-b-${i}`} className="flex items-center gap-2">
                  <div className={`w-8 ${textMuted}`}>{i + 1}.</div>
                  <div className="flex-1">{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOARD */}
      <div className="relative rounded-3xl shadow-2xl overflow-hidden border border-slate-800 bg-slate-900/40 backdrop-blur shrink-0">
        <div className="grid grid-cols-8">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const square = coord(r, c);
              const dark = (r + c) % 2 === 1;
              const bg = dark ? boardColors.dark : boardColors.light;
              const legal = isLegalTarget(r, c);

              return (
                <motion.div
                  key={square}
                  onClick={() => handleClick(r, c)}
                  whileTap={{ scale: isRunning ? 0.95 : 1 }}
                  className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center cursor-pointer"
                  style={{
                    background: bg,
                    opacity: isRunning ? 1 : 0.9,
                  }}
                >
                  {/* Last move highlight */}
                  {isLastSquare(r, c) && (
                    <div className="absolute inset-0" style={{ background: highlightColors.last }} />
                  )}

                  {/* Selected */}
                  {isSelectedSquare(r, c) && (
                    <div className="absolute inset-0" style={{ background: highlightColors.selected }} />
                  )}

                  {/* Legal-move dot */}
                  {legal && !piece && (
                    <div
                      className="w-3 h-3 rounded-full absolute"
                      style={{ background: "#020617", imageRendering: "pixelated" }}
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <img
                      src={pieceMap[piece.color + piece.type]}
                      className="w-10 h-10 md:w-14 md:h-14 pointer-events-none select-none"
                      draggable="false"
                      alt=""
                    />
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {gameResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center px-6">
            <div className="text-3xl md:text-4xl font-bold drop-shadow-lg leading-tight">
              {gameResult}
            </div>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <div
        className={`w-64 p-4 rounded-2xl border shadow-xl ${themeColors.text}`}
        style={{ ...retroFont, background: themeColors.sidebarBg, borderColor: themeColors.sidebarBorder }}
      >
        {/* Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setGameStatus("running")}
            className="flex-1 rounded-xl bg-slate-200 text-slate-900 py-2 text-xl hover:bg-slate-300 transition disabled:opacity-60"
            disabled={gameStatus === "running"}
          >
            Start
          </button>

          <button
            onClick={() => setGameStatus("paused")}
            className="flex-1 rounded-xl bg-slate-700 text-slate-100 py-2 text-xl hover:bg-slate-600 transition disabled:opacity-60"
            disabled={gameStatus === "paused"}
          >
            Pause
          </button>
        </div>

        <div className="mb-4">
          <div className={`${textPrimary} text-sm mb-1`}>Difficulty</div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={`w-full rounded-xl py-2 px-3 text-lg border focus:outline-none focus:border-slate-400 transition ${
              theme === "dark"
                ? "bg-slate-800 text-slate-100 border-slate-700"
                : "bg-white text-black border-slate-300"
            }`}
          >
            {Object.entries(DIFFICULTY_SETTINGS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={resetGame}
          className={`w-full rounded-xl text-white py-2 text-xl transition mb-5 ${
            resetDisabled ? "bg-red-500/40 cursor-not-allowed" : "bg-red-500/80 hover:bg-red-500"
          }`}
          disabled={resetDisabled}
        >
          Reset
        </button>

        {/* COMPUTER */}
        <div className="mb-6">
          <div className={`${textPrimary} text-lg`}>Computer</div>
          <div className="text-3xl mb-2">{formatTime(blackTime)}</div>

          <div className={`${textMuted} text-sm mb-1`}>Captured from me:</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {whiteCaptured.map((p, i) => (
              <img key={`wc-${i}`} src={pieceMap[p]} className="w-6 h-6" alt="" />
            ))}
          </div>
        </div>

        {/* ME */}
        <div className="mb-6">
          <div className={`${textPrimary} text-lg`}>Me</div>
          <div className="text-3xl mb-2">{formatTime(whiteTime)}</div>

          <div className={`${textMuted} text-sm mb-1`}>Captured from computer:</div>
          <div className="flex flex-wrap gap-1 mb-3">
            {blackCaptured.map((p, i) => (
              <img key={`bc-${i}`} src={pieceMap[p]} className="w-6 h-6" alt="" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
