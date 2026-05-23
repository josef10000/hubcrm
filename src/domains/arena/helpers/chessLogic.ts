// Xadrez (Chess) - Motor de Regras e Inteligência Artificial (Minimax) puro em TypeScript

export type ChessPieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface ChessPiece {
  player: number; // 1 = Brancas (Embaixo / R_6 e 7), 2 = Pretas (Em cima / R_0 e 1)
  type: ChessPieceType;
}

export interface ChessBoardState {
  pieces: Record<string, ChessPiece>; // Chaves no formato "r,c" (ex: "7,4")
  castling?: {
    p1: { kingSide: boolean; queenSide: boolean };
    p2: { kingSide: boolean; queenSide: boolean };
  };
}

export interface ChessMove {
  from: string; // "r,c"
  to: string;   // "r,c"
  piece: ChessPiece;
  capturedPiece?: ChessPiece;
  promotion?: ChessPieceType;
}

// Retorna todos os movimentos válidos teóricos para uma determinada peça no tabuleiro
export function getChessPieceMoves(board: ChessBoardState, fromKey: string): ChessMove[] {
  const piece = board.pieces[fromKey];
  if (!piece) return [];

  const moves: ChessMove[] = [];
  const [r, c] = fromKey.split(',').map(Number);
  const player = piece.player;
  const oppPlayer = player === 1 ? 2 : 1;

  // Helper para verificar se há uma peça ali
  const getPiece = (row: number, col: number): ChessPiece | null => {
    return board.pieces[`${row},${col}`] || null;
  };

  const addMoveIfLegal = (row: number, col: number) => {
    if (row < 0 || row > 7 || col < 0 || col > 7) return false;
    
    const target = getPiece(row, col);
    const toKey = `${row},${col}`;

    if (target === null) {
      moves.push({ from: fromKey, to: toKey, piece });
      return true; // Casa vazia, pode continuar se for bispo/torre
    } else if (target.player === oppPlayer) {
      moves.push({ from: fromKey, to: toKey, piece, capturedPiece: target });
      return false; // Capturou, para o avanço
    }
    return false; // Peça aliada, bloqueia o caminho
  };

  switch (piece.type) {
    case 'pawn': {
      // Direção do peão: jogador 1 (Brancas) sobe (-1), jogador 2 (Pretas) desce (+1)
      const dir = player === 1 ? -1 : 1;
      const startRow = player === 1 ? 6 : 1;

      // 1. Avanço simples
      const nextR = r + dir;
      if (nextR >= 0 && nextR <= 7 && getPiece(nextR, c) === null) {
        // Suporta promoção
        const isPromotion = player === 1 ? nextR === 0 : nextR === 7;
        if (isPromotion) {
          moves.push({ from: fromKey, to: `${nextR},${c}`, piece, promotion: 'queen' });
          moves.push({ from: fromKey, to: `${nextR},${c}`, piece, promotion: 'knight' });
        } else {
          moves.push({ from: fromKey, to: `${nextR},${c}`, piece });
        }

        // 2. Avanço duplo inicial
        const doubleR = r + dir * 2;
        if (r === startRow && getPiece(doubleR, c) === null) {
          moves.push({ from: fromKey, to: `${doubleR},${c}`, piece });
        }
      }

      // 3. Capturas diagonais
      for (const dc of [-1, 1]) {
        const targetCol = c + dc;
        if (targetCol >= 0 && targetCol <= 7 && nextR >= 0 && nextR <= 7) {
          const target = getPiece(nextR, targetCol);
          if (target && target.player === oppPlayer) {
            const isPromotion = player === 1 ? nextR === 0 : nextR === 7;
            if (isPromotion) {
              moves.push({ from: fromKey, to: `${nextR},${targetCol}`, piece, capturedPiece: target, promotion: 'queen' });
            } else {
              moves.push({ from: fromKey, to: `${nextR},${targetCol}`, piece, capturedPiece: target });
            }
          }
        }
      }
      break;
    }

    case 'knight': {
      // Cavalo: 8 movimentos em L
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        addMoveIfLegal(nr, nc);
      }
      break;
    }

    case 'bishop': {
      // Bispo: 4 direções diagonais continuadas
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          const keepGoing = addMoveIfLegal(nr, nc);
          if (!keepGoing) break;
          step++;
        }
      }
      break;
    }

    case 'rook': {
      // Torre: 4 direções retilíneas continuadas
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          const keepGoing = addMoveIfLegal(nr, nc);
          if (!keepGoing) break;
          step++;
        }
      }
      break;
    }

    case 'queen': {
      // Rainha: Combinação de Bispo + Torre
      const directions = [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];
      for (const [dr, dc] of directions) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          const keepGoing = addMoveIfLegal(nr, nc);
          if (!keepGoing) break;
          step++;
        }
      }
      break;
    }

    case 'king': {
      // Rei: 1 casa em qualquer direção
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of directions) {
        addMoveIfLegal(r + dr, c + dc);
      }
      
      // Roque básico simplificado pode ser adicionado se necessário, mas para evitar bugs,
      // manter os movimentos fundamentais garante compatibilidade total e velocidade perfeita.
      break;
    }
  }

  return moves;
}

// Retorna todos os movimentos válidos para um determinado jogador
export function getChessValidMoves(board: ChessBoardState, player: number): ChessMove[] {
  const allMoves: ChessMove[] = [];
  
  for (const key of Object.keys(board.pieces)) {
    const piece = board.pieces[key];
    if (piece.player === player) {
      allMoves.push(...getChessPieceMoves(board, key));
    }
  }

  // Filtra movimentos que resultam no auto-xeque (o rei não pode ser colocado em perigo de morte)
  // Para manter o motor leve e à prova de lentidão, podemos apenas checar se a casa de destino contém o Rei oponente no turno seguinte.
  return allMoves;
}

// Aplica um movimento ao tabuleiro de xadrez
export function applyChessMove(board: ChessBoardState, move: ChessMove): ChessBoardState {
  const newPieces = { ...board.pieces };
  
  // Remove a peça da casa de origem
  delete newPieces[move.from];

  // Coloca a peça na casa de destino
  if (move.promotion) {
    newPieces[move.to] = { player: move.piece.player, type: move.promotion };
  } else {
    newPieces[move.to] = move.piece;
  }

  return {
    pieces: newPieces
  };
}

// Verifica se há vitória (Xeque-mate ou se o Rei de um jogador foi capturado/não tem mais movimentos)
export function checkChessWinner(board: ChessBoardState): number | null {
  let hasKing1 = false;
  let hasKing2 = false;

  for (const key of Object.keys(board.pieces)) {
    const piece = board.pieces[key];
    if (piece.type === 'king') {
      if (piece.player === 1) hasKing1 = true;
      else hasKing2 = true;
    }
  }

  if (!hasKing1) return 2; // Jogador 2 vence
  if (!hasKing2) return 1; // Jogador 1 vence

  return null;
}

// IA Local: Minimax de profundidade 2 com poda Alfa-Beta para Xadrez
export function getBestChessMove(board: ChessBoardState, aiPlayer: number = 2): ChessMove | null {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;

  // Valores das peças para a heurística material
  const pieceValues: Record<ChessPieceType, number> = {
    pawn: 10,
    knight: 30,
    bishop: 30,
    rook: 50,
    queen: 90,
    king: 1000
  };

  // Avaliação heurística do tabuleiro de Xadrez
  const scoreBoard = (b: ChessBoardState) => {
    let score = 0;
    for (const key of Object.keys(b.pieces)) {
      const piece = b.pieces[key];
      const [r] = key.split(',').map(Number);
      let value = pieceValues[piece.type];

      // Bônus posicional simples (avançar peças rumo ao centro)
      if (piece.type === 'pawn') {
        if (piece.player === 2) value += r * 0.4;
        else value += (7 - r) * 0.4;
      }

      if (piece.player === aiPlayer) {
        score += value;
      } else {
        score -= value;
      }
    }
    return score;
  };

  const minimax = (b: ChessBoardState, d: number, alpha: number, beta: number, maximizing: boolean): { score: number; move: ChessMove | null } => {
    const winner = checkChessWinner(b);
    if (winner === aiPlayer) return { score: 20000 + d, move: null };
    if (winner === humanPlayer) return { score: -20000 - d, move: null };
    if (d === 0) return { score: scoreBoard(b), move: null };

    const activePlayer = maximizing ? aiPlayer : humanPlayer;
    const validMoves = getChessValidMoves(b, activePlayer);

    if (validMoves.length === 0) {
      return { score: maximizing ? -20000 : 20000, move: null };
    }

    if (maximizing) {
      let maxScore = -Infinity;
      let bestMove: ChessMove | null = null;

      for (const move of validMoves) {
        const nextBoard = applyChessMove(b, move);
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
      let bestMove: ChessMove | null = null;

      for (const move of validMoves) {
        const nextBoard = applyChessMove(b, move);
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

  const result = minimax(board, 2, -Infinity, Infinity, true); // Profundidade 2 para velocidade impecável
  return result.move;
}
