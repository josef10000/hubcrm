// Damas (Checkers) - Motor de Regras Oficial (Regra Brasileira de Longo Alcance) e IA Minimax
// Suporta a movimentação e capturas de longo alcance da Dama ("Dama Voadora") e Captura em Cadeia de Maioria

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

// Retorna os movimentos de deslize comuns para uma peça (sem saltos de captura)
export function getCheckersPieceSimpleMoves(board: CheckersGrid, r: number, c: number): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: CheckersMove[] = [];
  const player = piece.player;
  const isKing = piece.type === 'king';

  // Direções de diagonais
  const diagonals = [
    [-1, -1], [-1, 1],
    [1, -1],  [1, 1]
  ];

  // Direção de avanço para peças normais
  const forwardDir = player === 1 ? -1 : 1;

  if (!isKing) {
    // PEÇA NORMAL: Anda 1 casa para frente diagonalmente
    for (const dc of [-1, 1]) {
      const nr = r + forwardDir;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (board[nr][nc] === null) {
          moves.push({ from: [r, c], to: [nr, nc] });
        }
      }
    }
  } else {
    // DAMA VOADORA: Anda múltiplas casas livres diagonalmente
    for (const [dr, dc] of diagonals) {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;

        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;

        const target = board[nr][nc];
        if (target === null) {
          moves.push({ from: [r, c], to: [nr, nc] });
        } else {
          break; // Bloqueado
        }
        step++;
      }
    }
  }

  return moves;
}

// Lógica de Geração Recursiva de Cadeias de Captura
export function getPieceCaptureSequences(
  board: CheckersGrid,
  r: number,
  c: number,
  player: number,
  isKing: boolean,
  visitedEnemies: Set<string> = new Set()
): CheckersMove[][] {
  const oppPlayer = player === 1 ? 2 : 1;
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const sequences: CheckersMove[][] = [];

  if (!isKing) {
    // PEÇA NORMAL: Captura saltando 2 casas sobre o oponente (pode capturar para trás)
    for (const [dr, dc] of diagonals) {
      const enemyR = r + dr;
      const enemyC = c + dc;
      const destR = r + dr * 2;
      const destC = c + dc * 2;

      if (destR >= 0 && destR < 8 && destC >= 0 && destC < 8) {
        const enemyKey = `${enemyR},${enemyC}`;
        if (!visitedEnemies.has(enemyKey)) {
          const mid = board[enemyR][enemyC];
          const dest = board[destR][destC];
          if (mid && mid.player === oppPlayer && dest === null) {
            const currentMove: CheckersMove = {
              from: [r, c],
              to: [destR, destC],
              captures: [enemyR, enemyC]
            };

            // Criar um novo estado de tabuleiro simulado para a recursão
            const simulatedBoard = board.map(row => [...row]);
            simulatedBoard[destR][destC] = board[r][c];
            simulatedBoard[r][c] = null;
            simulatedBoard[enemyR][enemyC] = null; // Removido na simulação

            const nextVisited = new Set(visitedEnemies);
            nextVisited.add(enemyKey);

            const subSequences = getPieceCaptureSequences(
              simulatedBoard,
              destR,
              destC,
              player,
              isKing,
              nextVisited
            );

            if (subSequences.length > 0) {
              for (const sub of subSequences) {
                sequences.push([currentMove, ...sub]);
              }
            } else {
              sequences.push([currentMove]);
            }
          }
        }
      }
    }
  } else {
    // DAMA VOADORA (REGRA BRASILEIRA): Longo alcance
    for (const [dr, dc] of diagonals) {
      let step = 1;
      let encounteredEnemy = false;
      let enemyPos: [number, number] | null = null;
      let enemyKey = '';

      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;

        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;

        const target = board[nr][nc];

        if (!encounteredEnemy) {
          if (target === null) {
            // Deslizando livremente
          } else if (target.player === player) {
            break; // Bloqueado por peça própria
          } else {
            // Encontrou peça oponente
            enemyKey = `${nr},${nc}`;
            if (visitedEnemies.has(enemyKey)) {
              break; // Já capturada nesta sequência
            }
            encounteredEnemy = true;
            enemyPos = [nr, nc];
          }
        } else {
          // Casas vazias após a peça inimiga são pontos de pouso válidos
          if (target === null) {
            const currentMove: CheckersMove = {
              from: [r, c],
              to: [nr, nc],
              captures: enemyPos!
            };

            const simulatedBoard = board.map(row => [...row]);
            simulatedBoard[nr][nc] = board[r][c];
            simulatedBoard[r][c] = null;
            simulatedBoard[enemyPos![0]][enemyPos![1]] = null;

            const nextVisited = new Set(visitedEnemies);
            nextVisited.add(enemyKey);

            const subSequences = getPieceCaptureSequences(
              simulatedBoard,
              nr,
              nc,
              player,
              isKing,
              nextVisited
            );

            if (subSequences.length > 0) {
              for (const sub of subSequences) {
                sequences.push([currentMove, ...sub]);
              }
            } else {
              sequences.push([currentMove]);
            }
          } else {
            break; // Bloqueado por outra peça após a capturada
          }
        }
        step++;
      }
    }
  }

  return sequences;
}

// Retorna todas as sequências de capturas máximas elegíveis para o jogador (Regra da Maioria)
export function getCheckersMaxCaptureSequences(board: CheckersGrid, player: number): CheckersMove[][] {
  const allSequences: CheckersMove[][] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        const isKing = piece.type === 'king';
        const seqs = getPieceCaptureSequences(board, r, c, player, isKing);
        allSequences.push(...seqs);
      }
    }
  }

  if (allSequences.length === 0) return [];

  // Encontrar o comprimento máximo de capturas
  let maxCaptures = 0;
  for (const seq of allSequences) {
    if (seq.length > maxCaptures) {
      maxCaptures = seq.length;
    }
  }

  // Filtrar pela Regra da Maioria (comprimento máximo)
  return allSequences.filter(seq => seq.length === maxCaptures);
}

// Retorna todos os movimentos válidos imediatos (cumprindo a maioria nas capturas)
export function getCheckersValidMoves(board: CheckersGrid, player: number): CheckersMove[] {
  const maxSeqs = getCheckersMaxCaptureSequences(board, player);
  
  if (maxSeqs.length > 0) {
    // Retorna apenas os primeiros passos das cadeias máximas
    const firstStepsMap = new Map<string, CheckersMove>();
    for (const seq of maxSeqs) {
      const firstMove = seq[0];
      const key = `${firstMove.from[0]},${firstMove.from[1]}->${firstMove.to[0]},${firstMove.to[1]}`;
      firstStepsMap.set(key, firstMove);
    }
    return Array.from(firstStepsMap.values());
  }

  // Se não houver capturas, retorna movimentos de deslize simples
  const simpleMoves: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.player === player) {
        simpleMoves.push(...getCheckersPieceSimpleMoves(board, r, c));
      }
    }
  }
  return simpleMoves;
}

// Executa um movimento simples ou passo de captura
export function applyCheckersMove(board: CheckersGrid, move: CheckersMove): CheckersGrid {
  const newGrid = board.map(row => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  const piece = newGrid[fr][fc];
  if (!piece) return newGrid;

  // Move a peça
  newGrid[tr][tc] = piece;
  newGrid[fr][fc] = null;

  // Se for uma captura, remove do tabuleiro (nota: a exclusão real pós-cadeia é feita no componente, 
  // mas para compatibilidade removemos aqui também ou geramos o grid sem a peça capturada)
  if (move.captures) {
    const [cr, cc] = move.captures;
    newGrid[cr][cc] = null;
  }

  // Promoção a Dama (King):
  // Jogador 1 (Vermelho) vira Dama no topo (linha 0)
  // Jogador 2 (CPU/Preto) vira Dama no fundo (linha 7)
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

  if (p1Pieces === 0 || p1Moves.length === 0) return 2; // CPU / Preto vence
  if (p2Pieces === 0 || p2Moves.length === 0) return 1; // Humano / Vermelho vence

  return null;
}

// IA Local: Minimax Alfa-Beta adaptado para capturas em cadeia de maioria
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
            value += (aiPlayer === 2 ? r : 7 - r) * 0.4;
            score += value;
          } else {
            value += (humanPlayer === 2 ? r : 7 - r) * 0.4;
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
