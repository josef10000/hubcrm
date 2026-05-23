// Damas (Checkers) - Motor de Regras e Inteligência Artificial (Minimax)

export interface CheckersPiece {
  player: number; // 1 = Vermelhas (Embaixo), 2 = Pretas (Em cima)
  type: 'normal' | 'king';
}

export type CheckersGrid = (CheckersPiece | null)[][];

export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  captures?: [number, number]; // Coordenadas da peça capturada, se houver
}

// Retorna todos os movimentos válidos para uma determinada peça no tabuleiro
export function getCheckersPieceMoves(board: CheckersGrid, r: number, c: number): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: CheckersMove[] = [];
  const player = piece.player;
  const isKing = piece.type === 'king';

  // Direções de avanço baseadas no jogador
  // Jogador 1 (vermelhas) avança de baixo para cima (r diminui: -1)
  // Jogador 2 (pretas) avança de cima para baixo (r aumenta: +1)
  const forwardDirections = player === 1 ? [-1] : [1];
  // Reis podem se mover em qualquer direção diagonal
  const directions = isKing ? [-1, 1] : forwardDirections;

  // 1. Verificar movimentos normais (diagonais simples de 1 casa)
  for (const dr of directions) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;

      // Dentro dos limites e destino vazio
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (board[nr][nc] === null) {
          moves.push({ from: [r, c], to: [nr, nc] });
        }
      }
    }
  }

  // 2. Verificar movimentos de captura (diagonais duplas de 2 casas pulando uma peça adversária)
  const captureDirections = [-1, 1]; // Capturas podem acontecer para trás mesmo para peças normais em várias regras
  for (const dr of captureDirections) {
    for (const dc of [-1, 1]) {
      const nr = r + dr;
      const nc = c + dc;
      const jumpR = r + dr * 2;
      const jumpC = c + dc * 2;

      // Dentro dos limites da mesa
      if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
        const midPiece = board[nr][nc];
        const destPiece = board[jumpR][jumpC];

        // Peça no meio é do oponente e casa de destino está vazia
        if (midPiece && midPiece.player !== player && destPiece === null) {
          // Peças normais só podem capturar na direção de movimento, a menos que seja rei (ou regra flexível de captura total)
          if (isKing || forwardDirections.includes(dr) || true) { // Permitir captura para trás como padrão dinâmico intuitivo
            moves.push({
              from: [r, c],
              to: [jumpR, jumpC],
              captures: [nr, nc]
            });
          }
        }
      }
    }
  }

  return moves;
}

// Retorna todos os movimentos válidos de um jogador (se existirem capturas, as regras de damas exigem que as capturas sejam obrigatórias)
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

  // Filtrar para capturas obrigatórias se alguma captura estiver disponível
  const captures = allMoves.filter(m => m.captures);
  if (captures.length > 0) return captures;

  return allMoves;
}

// Executa um movimento no grid e promove a rei se chegar à última fileira
export function applyCheckersMove(board: CheckersGrid, move: CheckersMove): CheckersGrid {
  const newGrid = board.map(row => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  const piece = newGrid[fr][fc];
  if (!piece) return newGrid;

  // Move a peça
  newGrid[tr][tc] = piece;
  newGrid[fr][fc] = null;

  // Remove peça capturada se houver
  if (move.captures) {
    const [cr, cc] = move.captures;
    newGrid[cr][cc] = null;
  }

  // Promoção a Dama (King): jogador 1 chega ao topo (r=0), jogador 2 chega ao fundo (r=7)
  if (piece.player === 1 && tr === 0 && piece.type === 'normal') {
    newGrid[tr][tc] = { ...piece, type: 'king' };
  } else if (piece.player === 2 && tr === 7 && piece.type === 'normal') {
    newGrid[tr][tc] = { ...piece, type: 'king' };
  }

  return newGrid;
}

// Verifica se há um vencedor (ou se um jogador ficou sem peças/movimentos)
export function checkCheckersWinner(board: CheckersGrid): number | null {
  const p1Moves = getCheckersValidMoves(board, 1);
  const p2Moves = getCheckersValidMoves(board, 2);

  // Contagem de peças
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

  // Heurística de avaliação do tabuleiro para Damas
  const scoreBoard = (b: CheckersGrid) => {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (piece) {
          let value = piece.type === 'king' ? 14 : 10;
          
          // Favorecer avançar peças normais e manter a base sólida
          if (piece.player === aiPlayer) {
            // Pontuar posições avançadas
            if (aiPlayer === 2) value += r * 0.5; // pretas avançam para baixo
            else value += (7 - r) * 0.5;
            
            score += value;
          } else {
            if (humanPlayer === 2) value += r * 0.5;
            else value += (7 - r) * 0.5;
            
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
