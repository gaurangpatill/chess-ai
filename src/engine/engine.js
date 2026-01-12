// src/engine/engine.js

// MATERIAL VALUES
export const MATERIAL = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const MATE_SCORE = 100000;

export const DIFFICULTY_CONFIG = {
  beginner: { depth: 2, nodeLimit: 8000, randomness: 0.35, timeMs: 800 },
  moderate: { depth: 3, nodeLimit: 20000, randomness: 0.05, timeMs: 1500 },
  advanced: { depth: 4, nodeLimit: 60000, randomness: 0, timeMs: 3000 },
};

export function isThreefold(game) {
  // Newer chess.js version:
  if (typeof game.isThreefoldRepetition === "function") {
    return game.isThreefoldRepetition();
  }

  // Older chess.js version:
  if (typeof game.inThreefoldRepetition === "function") {
    return game.inThreefoldRepetition();
  }

  return false;
}


// ----------------------------
// PIECE-SQUARE TABLES (midgame)
// ----------------------------
const PST_P = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const PST_N = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const PST_B = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const PST_R = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const PST_Q = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const PST_K = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST = { p: PST_P, n: PST_N, b: PST_B, r: PST_R, q: PST_Q, k: PST_K };

// -------------------------------------------
// SAFE HELPERS
// -------------------------------------------
export function safeMoves(game) {
  try {
    return game.moves({ verbose: true }) || [];
  } catch {
    return [];
  }
}

export function getValue(p) {
  return MATERIAL[p] || 0;
}

// -------------------------------------------
// EVALUATE POSITION (safe, non-freezing)
// -------------------------------------------
export function evaluate(game) {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -MATE_SCORE : MATE_SCORE;
  }
  if (game.isDraw() || isThreefold(game)) return 0;


  const board = game.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;

      const base = MATERIAL[p.type];
      const table = PST[p.type];
      let pst = 0;

      if (table) {
        pst = p.color === "w" ? table[r][c] : -table[7 - r][c];
      }

      score += p.color === "w" ? base + pst : -(base + pst);
    }
  }

  // Mobility bonus
  const mobility = safeMoves(game).length;
  score += (game.turn() === "w" ? 1 : -1) * mobility * 2;

  return score;
}

// -------------------------------------------
// ORDER MOVES SAFELY (no undefined data)
// -------------------------------------------
export function orderMovesSafe(moves) {
  return moves
    .map((mv) => ({
      mv,
      score:
        (mv.captured ? MATERIAL[mv.captured] * 10 : 0) -
        (mv.piece ? MATERIAL[mv.piece] : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.mv);
}

// -------------------------------------------
// MINIMAX SAFE + NODE LIMIT
// -------------------------------------------
export function minimaxSafe(game, depth, alpha, beta, maximizing, state) {
  if (++state.nodes >= state.nodeLimit) return evaluate(game);
  if (state.endTime && Date.now() >= state.endTime) return evaluate(game);
  if (depth === 0 || game.isGameOver()) return evaluate(game);

  const moves = orderMovesSafe(safeMoves(game));
  if (moves.length === 0) return evaluate(game);

  if (maximizing) {
    let best = -Infinity;
    for (const mv of moves) {
      game.move(mv);
      const val = minimaxSafe(
        game,
        depth - 1,
        alpha,
        beta,
        false,
        state
      );
      game.undo();
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const mv of moves) {
      game.move(mv);
      const val = minimaxSafe(
        game,
        depth - 1,
        alpha,
        beta,
        true,
        state
      );
      game.undo();
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// -------------------------------------------
// ROOT SEARCH (Difficulty B)
// -------------------------------------------
function chooseMoveWithRandomness(scoredMoves, randomness) {
  if (!randomness || scoredMoves.length <= 1) {
    return scoredMoves[0].mv;
  }

  const maxIndex = Math.max(1, Math.round(scoredMoves.length * randomness)) - 1;
  const idx = Math.floor(Math.random() * (maxIndex + 1));
  return scoredMoves[idx].mv;
}

export function findBestMove(game, difficulty = "moderate") {
  if (game.isCheckmate() || game.isDraw()) return null;

  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.moderate;
  const moves = orderMovesSafe(safeMoves(game));
  if (!moves.length) return null;

  // Immediate mate detection
  for (const mv of moves) {
    game.move(mv);
    if (game.isCheckmate()) {
      game.undo();
      return mv;
    }
    game.undo();
  }

  const endTime = cfg.timeMs ? Date.now() + cfg.timeMs : null;
  let best = moves[0];
  let bestEval = Infinity;

  // Iterative deepening up to cfg.depth with node/time budget
  for (let d = 1; d <= cfg.depth; d++) {
    const state = { nodes: 0, nodeLimit: cfg.nodeLimit, endTime };
    let depthBest = best;
    let depthBestEval = bestEval;

    for (const mv of moves) {
      game.move(mv);
      const val = minimaxSafe(game, d - 1, -Infinity, Infinity, true, state);
      game.undo();

      if (val < depthBestEval) {
        depthBestEval = val;
        depthBest = mv;
      }

      if (state.endTime && Date.now() >= state.endTime) break;
    }

    best = depthBest;
    bestEval = depthBestEval;

    if (state.endTime && Date.now() >= state.endTime) break;
  }

  return chooseMoveWithRandomness([{ mv: best, score: bestEval }, { mv: best, score: bestEval }], cfg.randomness);
}

// Legacy export used elsewhere; keep pointing to moderate settings
export function findBestMoveB(game) {
  return findBestMove(game, "moderate");
}
