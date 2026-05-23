// Damas (Checkers) - Motor de Regras Oficial (Regra Brasileira de Longo Alcance) e IA Minimax
// Suporta a movimentação e capturas de longo alcance da Dama ("Dama Voadora")

export interface CheckersPiece {
  player: number; // 1 = Vermelhas (Embaixo / Você), 2 = Pretas/Metálicas (Em cima / CPU)
  type: 'normal' | 'king';
}

export type CheckersGrid = (CheckersPiece | null)[][];

export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  captures?: [number, number]; // Coordenadas da peça capturada
}

// Retorna todos os movimentos válidos para uma determinada peça no tabuleiro
export function getCheckersPieceMoves(board: CheckersGrid, r: number, c: number): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: CheckersMove[] = [];
  const player = piece.player;
  const oppPlayer = player === 1 ? 2 : 1;
  const isKing = piece.type === 'king';

  // Direções de diagonais
  const diagonals = [
    [-1, -1], [-1, 1],
    [1, -1],  [1, 1]
  ];

  // Direção de avanço para peças normais
  // Jogador 1 (Vermelho/Você) começa embaixo (linhas 5..7) e sobe (-1)
  // Jogador 2 (CPU/Preto) começa em cima (linhas 0..2) e desce (+1)
  const forwardDir = player === 1 ? -1 : 1;

  if (!isKing) {
    // ----------------------------------------------------
    // PEÇA NORMAL: Anda 1 casa para frente diagonalmente
    // ----------------------------------------------------
    for (const dc of [-1, 1]) {
      const nr = r + forwardDir;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (board[nr][nc] === null) {
          moves.push({ from: [r, c], to: [nr, nc] });
        }
      }
    }

    // Peça normal captura saltando 2 casas sobre o oponente (pode capturar para trás)
    for (const [dr, dc] of diagonals) {
      const enemyR = r + dr;
      const enemyC = c + dc;
      const destR = r + dr * 2;
      const destC = c + dc * 2;

      if (destR >= 0 && destR < 8 && destC >= 0 && destC < 8) {
        const mid = board[enemyR][enemyC];
        const dest = board[destR][destC];
        if (mid && mid.player === oppPlayer && dest === null) {
          moves.push({
            from: [r, c],
            to: [destR, destC],
            captures: [enemyR, enemyC]
          });
        }
      }
    }
  } else {
    // ----------------------------------------------------
    // DAMA VOADORA (REGRA BRASILEIRA): Anda múltiplas casas livres diagonalmente
    // ----------------------------------------------------
    for (const [dr, dc] of diagonals) {
      let step = 1;
      let encounteredEnemy = false;
      let enemyPos: [number, number] | null = null;

      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;

        // Limite do tabuleiro
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;

        const target = board[nr][nc];

        if (!encounteredEnemy) {
          if (target === null) {
            // Casa livre: movimento normal de Dama
            moves.push({ from: [r, c], to: [nr, nc] });
          } else if (target.player === player) {
            // Bloqueado por peça própria
            break;
          } else {
            // Encontrou peça adversária
            encounteredEnemy = true;
            enemyPos = [nr, nc];
          }
        } else {
          // Já pulamos a peça inimiga. Casas vazias após ela são locais de pouso de captura válidos.
          if (target === null) {
            moves.push({
              from: [r, c],
              to: [nr, nc],
              captures: enemyPos!
            });
          } else {
            // Bloqueado por outra peça após a capturada (só pode pular 1 por diagonal)
            break;
          }
        }
        step++;
      }
    }
  }

  return moves;
}

// Retorna todos os movimentos válidos de um jogador (com capturas obrigatórias se disponíveis)
export function getCheckersValidMoves(board: CheckersGrid, player: number): CheckersMove[] {
  let allMoves: CheckersMove[] = [];
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        allMoves.push(...getCheckersPieceMoves(board, r, c));
      }
    }
  }

  // Filtrar para capturas obrigatórias (regra oficial de damas)
  const captures = allMoves.filter(m => m.captures);
  if (captures.length > 0) return captures;

  return allMoves;
}

// Executa um movimento no grid e promove a Dama
export function applyCheckersMove(board: CheckersGrid, move: CheckersMove): CheckersGrid {
  const newGrid = board.map(row => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  const piece = newGrid[fr][fc];
  if (!piece) return newGrid;

  // Move a peça
  newGrid[tr][tc] = piece;
  newGrid[fr][fc] = null;

  // Remove a peça capturada se houver
  if (move.captures) {
    const [cr, cc] = move.captures;
    newGrid[cr][cc] = null;
  }

  // Promoção a Dama (King):
  // Jogador 1 (Vermelho) vira Dama ao alcançar o topo (linha 0)
  // Jogador 2 (CPU/Preto) vira Dama ao alcançar o fundo (linha 7)
  if (piece.player === 1 && tr === 0 && piece.type === 'normal') {
    newGrid[tr][tc] = { ...piece, type: 'king' };
  } else if (piece.player === 2 && tr === 7 && piece.type === 'normal') {
    newGrid[tr][tc] = { ...piece, type: 'king' };
  }

  return newGrid;
}

// Verifica se há um vencedor
export function checkCheckersWinner(board: CheckersGrid): number | null {
  const p1Moves = getCheckersValidMoves(board, 1);
  const p2Moves = getCheckersValidMoves(board, 2);

  let p1Pieces = 0;
  let p2Pieces = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.player === 1) p1Pieces++;
        else p2Pieces++;
      }
    }
  }

  if (p1Pieces === 0 || p1Moves.length === 0) return 2; // Jogador 2 vence
  if (p2Pieces === 0 || p2Moves.length === 0) return 1; // Jogador 1 vence

  return null;
}

// IA Local: Minimax com Alfa-Beta para Damas
export function getBestCheckersMove(board: CheckersGrid, depth: number = 4, aiPlayer: number = 2): CheckersMove | null {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;

  const scoreBoard = (b: CheckersGrid) => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (piece) {
          let value = piece.type === 'king' ? 25 : 10;
          
          if (piece.player === aiPlayer) {
            if (aiPlayer === 2) value += r * 0.4;
            else value += (7 - r) * 0.4;
            score += value;
          } else {
            if (humanPlayer === 2) value += r * 0.4;
            else value += (7 - r) * 0.4;
            score -= value;
          }
        }
      }
    }
    return score;
  };

  const minimax = (b: CheckersGrid, d: number, alpha: number, beta: number, maximizing: boolean): { score: number; move: CheckersMove | null } => {
    const winner = checkCheckersWinner(b);
    if (winner === aiPlayer) return { score: 10000 + d, move: null };
    if (winner === humanPlayer) return { score: -10000 - d, move: null };
    if (d === 0) return { score: scoreBoard(b), move: null };

    const activePlayer = maximizing ? aiPlayer : humanPlayer;
    const validMoves = getCheckersValidMoves(b, activePlayer);

    if (validMoves.length === 0) {
      return { score: maximizing ? -10000 : 10000, move: null };
    }

    if (maximizing) {
      let maxScore = -Infinity;
      let bestMove: CheckersMove | null = null;

      for (const move of validMoves) {
        const nextBoard = applyCheckersMove(b, move);
        const { score } = minimax(nextBoard, d - 1, alpha, beta, false);
        
        if (score > maxScore) {
          maxScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      }
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      let bestMove: CheckersMove | null = null;

      for (const move of validMoves) {
        const nextBoard = applyCheckersMove(b, move);
        const { score } = minimax(nextBoard, d - 1, alpha, beta, true);

        if (score < minScore) {
          minScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
        if (alpha >= beta) break;
      }
      return { score: minScore, move: bestMove };
    }
  };

  const result = minimax(board, depth, -Infinity, Infinity, true);
  return result.move;
}
