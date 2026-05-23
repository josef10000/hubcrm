// Xadrez (Chess) - Motor de Regras e Inteligência Artificial (Minimax) em TypeScript
// Suporta a movimentação especial do Roque (Castling)

export type ChessPieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface ChessPiece {
  player: number; // 1 = Brancas (Você), 2 = Pretas/Metálicas (CPU)
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
      return true; // Casa vazia, pode continuar
    } else if (target.player === oppPlayer) {
      moves.push({ from: fromKey, to: toKey, piece, capturedPiece: target });
      return false; // Capturou, para o avanço
    }
    return false; // Peça aliada, bloqueia o caminho
  };

  switch (piece.type) {
    case 'pawn': {
      const dir = player === 1 ? -1 : 1;
      const startRow = player === 1 ? 6 : 1;

      // 1. Avanço simples
      const nextR = r + dir;
      if (nextR >= 0 && nextR <= 7 && getPiece(nextR, c) === null) {
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
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        addMoveIfLegal(r + dr, c + dc);
      }
      break;
    }

    case 'bishop': {
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
      // Rei: 1 casa diagonal ou adjacente
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of directions) {
        addMoveIfLegal(r + dr, c + dc);
      }
      
      // ----------------------------------------------------
      // JOGADA ESPECIAL: O ROQUE (CASTLING)
      // ----------------------------------------------------
      if (player === 1 && r === 7 && c === 4) {
        // 1. Roque ala do Rei (King Side)
        const rookKingSide = getPiece(7, 7);
        if (rookKingSide && rookKingSide.player === 1 && rookKingSide.type === 'rook') {
          if (getPiece(7, 5) === null && getPiece(7, 6) === null) {
            moves.push({ from: '7,4', to: '7,6', piece });
          }
        }
        // 2. Roque ala da Rainha (Queen Side)
        const rookQueenSide = getPiece(7, 0);
        if (rookQueenSide && rookQueenSide.player === 1 && rookQueenSide.type === 'rook') {
          if (getPiece(7, 1) === null && getPiece(7, 2) === null && getPiece(7, 3) === null) {
            moves.push({ from: '7,4', to: '7,2', piece });
          }
        }
      } else if (player === 2 && r === 0 && c === 4) {
        // 1. Roque ala do Rei (King Side)
        const rookKingSide = getPiece(0, 7);
        if (rookKingSide && rookKingSide.player === 2 && rookKingSide.type === 'rook') {
          if (getPiece(0, 5) === null && getPiece(0, 6) === null) {
            moves.push({ from: '0,4', to: '0,6', piece });
          }
        }
        // 2. Roque ala da Rainha (Queen Side)
        const rookQueenSide = getPiece(0, 0);
        if (rookQueenSide && rookQueenSide.player === 2 && rookQueenSide.type === 'rook') {
          if (getPiece(0, 1) === null && getPiece(0, 2) === null && getPiece(0, 3) === null) {
            moves.push({ from: '0,4', to: '0,2', piece });
          }
        }
      }
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
  return allMoves;
}

// Aplica um movimento ao tabuleiro de xadrez (suporta Roque)
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

  // ----------------------------------------------------
  // MOVIMENTO DE ROQUE: Move a respectiva Torre junto
  // ----------------------------------------------------
  if (move.piece.type === 'king') {
    // Brancas
    if (move.from === '7,4' && move.to === '7,6') {
      delete newPieces['7,7'];
      newPieces['7,5'] = { player: 1, type: 'rook' };
    } else if (move.from === '7,4' && move.to === '7,2') {
      delete newPieces['7,0'];
      newPieces['7,3'] = { player: 1, type: 'rook' };
    }
    // Pretas
    else if (move.from === '0,4' && move.to === '0,6') {
      delete newPieces['0,7'];
      newPieces['0,5'] = { player: 2, type: 'rook' };
    } else if (move.from === '0,4' && move.to === '0,2') {
      delete newPieces['0,0'];
      newPieces['0,3'] = { player: 2, type: 'rook' };
    }
  }

  return {
    pieces: newPieces
  };
}

// Verifica se há vitória
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

// IA Local: Minimax de profundidade 2
export function getBestChessMove(board: ChessBoardState, aiPlayer: number = 2): ChessMove | null {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;

  const pieceValues: Record<ChessPieceType, number> = {
    pawn: 10,
    knight: 30,
    bishop: 30,
    rook: 50,
    queen: 90,
    king: 1000
  };

  const scoreBoard = (b: ChessBoardState) => {
    let score = 0;
    for (const key of Object.keys(b.pieces)) {
      const piece = b.pieces[key];
      const [r] = key.split(',').map(Number);
      let value = pieceValues[piece.type];

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

  const result = minimax(board, 2, -Infinity, Infinity, true);
  return result.move;
}
