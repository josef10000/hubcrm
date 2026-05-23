// Connect 4 - Motor de Regras e Inteligência Artificial (Minimax)

export type CellValue = number | null; // 1 = Jogador 1 (Azul), 2 = Jogador 2 (Rosa)
export type BoardGrid = CellValue[][];

// Verifica se há vitória no tabuleiro
export function checkConnect4Winner(board: BoardGrid): { winner: number; line: [number, number][] } | null {
  const rows = board.length;
  const cols = board[0].length;

  // 1. Horizontal
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 3; c++) {
      const val = board[r][c];
      if (val && val === board[r][c+1] && val === board[r][c+2] && val === board[r][c+3]) {
        return { winner: val, line: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
      }
    }
  }

  // 2. Vertical
  for (let r = 0; r < rows - 3; r++) {
    for (let c = 0; c < cols; c++) {
      const val = board[r][c];
      if (val && val === board[r+1][c] && val === board[r+2][c] && val === board[r+3][c]) {
        return { winner: val, line: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
      }
    }
  }

  // 3. Diagonal Ascendente (/)
  for (let r = 3; r < rows; r++) {
    for (let c = 0; c < cols - 3; c++) {
      const val = board[r][c];
      if (val && val === board[r-1][c+1] && val === board[r-2][c+2] && val === board[r-3][c+3]) {
        return { winner: val, line: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
      }
    }
  }

  // 4. Diagonal Descendente (\)
  for (let r = 0; r < rows - 3; r++) {
    for (let c = 0; c < cols - 3; c++) {
      const val = board[r][c];
      if (val && val === board[r+1][c+1] && val === board[r+2][c+2] && val === board[r+3][c+3]) {
        return { winner: val, line: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
      }
    }
  }

  return null;
}

// Verifica se deu empate (todas as colunas no topo cheias)
export function isConnect4Draw(board: BoardGrid): boolean {
  return board[0].every(cell => cell !== null);
}

// Encontra a linha livre em uma coluna (caindo por gravidade)
export function getConnect4FreeRow(board: BoardGrid, col: number): number {
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

// IA Local: Algoritmo Minimax com poda Alfa-Beta para o Connect 4
export function getBestConnect4Move(board: BoardGrid, depth: number = 4, aiPlayer: number = 2): number {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  const cols = board[0].length;
  
  // Lista de colunas com espaço livre
  const getValidMoves = (b: BoardGrid) => {
    const valid = [];
    for (let c = 0; c < cols; c++) {
      if (b[0][c] === null) valid.push(c);
    }
    return valid;
  };

  // Heurística de avaliação de uma janela de 4 células
  const evaluateWindow = (window: CellValue[], player: number) => {
    const opp = player === 1 ? 2 : 1;
    let score = 0;
    const playerCount = window.filter(cell => cell === player).length;
    const emptyCount = window.filter(cell => cell === null).length;
    const oppCount = window.filter(cell => cell === opp).length;

    if (playerCount === 4) score += 1000;
    else if (playerCount === 3 && emptyCount === 1) score += 50;
    else if (playerCount === 2 && emptyCount === 2) score += 10;

    if (oppCount === 3 && emptyCount === 1) score -= 80; // Bloqueio prioritário

    return score;
  };

  // Avaliação heurística do tabuleiro inteiro
  const scoreBoard = (b: BoardGrid, player: number) => {
    let score = 0;
    const rows = b.length;
    
    // Favorecer o centro do tabuleiro (coluna 3)
    const centerArray = b.map(row => row[3]);
    const centerCount = centerArray.filter(cell => cell === player).length;
    score += centerCount * 6;

    // Horizontal
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        const window = [b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]];
        score += evaluateWindow(window, player);
      }
    }

    // Vertical
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols; c++) {
        const window = [b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]];
        score += evaluateWindow(window, player);
      }
    }

    // Diagonal /
    for (let r = 3; r < rows; r++) {
      for (let c = 0; c < cols - 3; c++) {
        const window = [b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]];
        score += evaluateWindow(window, player);
      }
    }

    // Diagonal \
    for (let r = 0; r < rows - 3; r++) {
      for (let c = 0; c < cols - 3; c++) {
        const window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
        score += evaluateWindow(window, player);
      }
    }

    return score;
  };

  // Função interna de Minimax recursiva com poda Alfa-Beta
  const minimax = (b: BoardGrid, d: number, alpha: number, beta: number, maximizing: boolean): { score: number; column: number } => {
    const validMoves = getValidMoves(b);
    const winResult = checkConnect4Winner(b);
    
    if (winResult) {
      if (winResult.winner === aiPlayer) return { score: 100000 + d, column: -1 };
      return { score: -100000 - d, column: -1 };
    }
    if (validMoves.length === 0) return { score: 0, column: -1 };
    if (d === 0) return { score: scoreBoard(b, aiPlayer), column: -1 };

    if (maximizing) {
      let maxScore = -Infinity;
      let bestCol = validMoves[Math.floor(Math.random() * validMoves.length)];

      for (const col of validMoves) {
        const row = getConnect4FreeRow(b, col);
        // Cria cópia do grid
        const copy = b.map(r => [...r]);
        copy[row][col] = aiPlayer;

        const { score } = minimax(copy, d - 1, alpha, beta, false);
        if (score > maxScore) {
          maxScore = score;
          bestCol = col;
        }
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      }
      return { score: maxScore, column: bestCol };
    } else {
      let minScore = Infinity;
      let bestCol = validMoves[Math.floor(Math.random() * validMoves.length)];

      for (const col of validMoves) {
        const row = getConnect4FreeRow(b, col);
        const copy = b.map(r => [...r]);
        copy[row][col] = humanPlayer;

        const { score } = minimax(copy, d - 1, alpha, beta, true);
        if (score < minScore) {
          minScore = score;
          bestCol = col;
        }
        beta = Math.min(beta, score);
        if (alpha >= beta) break;
      }
      return { score: minScore, column: bestCol };
    }
  };

  // Se for o primeiro movimento da IA e o centro estiver livre, joga no centro
  if (board[5][3] === null) return 3;

  const result = minimax(board, depth, -Infinity, Infinity, true);
  return result.column;
}
