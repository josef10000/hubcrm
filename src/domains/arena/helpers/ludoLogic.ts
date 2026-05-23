// Ludo - Motor de Regras e Inteligência Artificial Local em TypeScript
// Focado em Duelo de 2 Jogadores: Vermelho (Jogador 1 / Humano) vs Verde (Jogador 2 / CPU ou Oponente)

export type LudoColor = 'red' | 'green';

export interface LudoToken {
  id: number; // 0..3 (4 peças por jogador)
  color: LudoColor;
  // -1 = Na Base
  // 0..51 = Posições no circuito comum de 52 casas
  // 100..105 = Posições na reta final (5 casas + casa de chegada)
  position: number;
}

export interface LudoBoardState {
  tokens: LudoToken[];
  diceValue: number | null;
  hasRolled: boolean;
  consecutiveSixes: number;
  winnerColor: LudoColor | null;
}

// Casa de saída para cada cor
export const LUDO_START_POSITION: Record<LudoColor, number> = {
  red: 0,
  green: 26
};

// Casa limite antes de entrar na reta final
export const LUDO_ENTRY_LIMIT: Record<LudoColor, number> = {
  red: 50,
  green: 24
};

// Mapeamento de coordenadas X,Y de cada casa no tabuleiro tradicional 15x15 de Ludo
// Isso nos permite desenhar um tabuleiro perfeito e com responsividade usando Grid e coordenadas 2D.
export function getLudoCoords(color: LudoColor, token: LudoToken): { x: number; y: number } {
  // Se está na base, posiciona nos ninhos específicos dos cantos
  if (token.position === -1) {
    const offsets = [
      { dx: 0, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 1, dy: 1 }
    ];
    const off = offsets[token.id];
    if (color === 'red') {
      return { x: 2 + off.dx * 1.5, y: 2 + off.dy * 1.5 }; // Quadrante Superior Esquerdo
    } else {
      return { x: 11 + off.dx * 1.5, y: 2 + off.dy * 1.5 }; // Quadrante Superior Direito (Verde no duelo)
    }
  }

  // Se já chegou ao fim (vitória)
  if (token.position === 105) {
    return { x: 7, y: 7 }; // Centro do tabuleiro
  }

  // Se está na reta final
  if (token.position >= 100 && token.position < 105) {
    const index = token.position - 100;
    if (color === 'red') {
      return { x: 1 + index, y: 7 }; // Linha vermelha subindo na horizontal da esquerda
    } else {
      return { x: 7, y: 1 + index }; // Linha verde descendo na vertical do topo
    }
  }

  // Posições do circuito comum externo de 52 casas (indexados de 0 a 51)
  const circuitCoords: { x: number; y: number }[] = [
    // Lado esquerdo (Pistas horizontais)
    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
    // Topo esquerdo (subindo verticalmente)
    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
    // Meio topo
    { x: 7, y: 0 },
    // Topo direito (descendo verticalmente)
    { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
    // Lado direito superior
    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
    // Meio direito
    { x: 14, y: 7 },
    // Lado direito inferior
    { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
    // Lado inferior direito (descendo)
    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
    // Meio inferior
    { x: 7, y: 14 },
    // Lado inferior esquerdo (subindo)
    { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
    // Lado esquerdo inferior (esquerda)
    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
    // Meio esquerdo
    { x: 0, y: 7 },
    // Primeira casa
    { x: 0, y: 6 }
  ];

  return circuitCoords[token.position % 52] || { x: 0, y: 0 };
}

// Cria o estado inicial padrão de uma partida de Ludo
export function createInitialLudoState(): LudoBoardState {
  const tokens: LudoToken[] = [];
  for (let i = 0; i < 4; i++) {
    tokens.push({ id: i, color: 'red', position: -1 });
    tokens.push({ id: i, color: 'green', position: -1 });
  }

  return {
    tokens,
    diceValue: null,
    hasRolled: false,
    consecutiveSixes: 0,
    winnerColor: null
  };
}

// Retorna se um token específico pode se mover com o valor do dado rolado
export function canLudoTokenMove(token: LudoToken, diceValue: number): boolean {
  // 1. Se está na base, precisa de 6 para sair
  if (token.position === -1) {
    return diceValue === 6;
  }

  // 2. Se já chegou ao fim, não se move
  if (token.position === 105) {
    return false;
  }

  // 3. Se está no caminho final, precisa do valor exato para chegar ao 105
  if (token.position >= 100) {
    const spacesLeft = 105 - token.position;
    return diceValue <= spacesLeft;
  }

  // 4. No caminho comum, pode se mover sempre
  return true;
}

// Retorna as jogadas válidas de um jogador baseado no dado atual
export function getLudoValidMoves(board: LudoBoardState, color: LudoColor): LudoToken[] {
  if (board.diceValue === null) return [];
  return board.tokens.filter(t => t.color === color && canLudoTokenMove(t, board.diceValue!));
}

// Aplica o movimento a uma peça no Ludo
export function applyLudoMove(board: LudoBoardState, tokenToMove: LudoToken, diceValue: number): LudoBoardState {
  const newTokens = board.tokens.map(t => {
    if (t.color === tokenToMove.color && t.id === tokenToMove.id) {
      const copy = { ...t };
      
      // Caso 1: Sair da Base
      if (copy.position === -1 && diceValue === 6) {
        copy.position = LUDO_START_POSITION[copy.color];
        return copy;
      }

      // Caso 2: Movimentação na Reta Final
      if (copy.position >= 100) {
        const nextPos = copy.position + diceValue;
        if (nextPos <= 105) copy.position = nextPos;
        return copy;
      }

      // Caso 3: Movimentação no Percurso Comum
      // Precisamos verificar se ele vai passar pela entrada da sua reta final
      const startPos = LUDO_START_POSITION[copy.color];
      const entryLimit = LUDO_ENTRY_LIMIT[copy.color];
      
      let stepCount = 0;
      let currPos = copy.position;

      while (stepCount < diceValue) {
        if (currPos === entryLimit) {
          // Entra na reta final!
          copy.position = 100 + (diceValue - stepCount - 1);
          return copy;
        }
        currPos = (currPos + 1) % 52;
        stepCount++;
      }

      copy.position = currPos;
      return copy;
    }
    return t;
  });

  // Lógica de "Comer" (Capture)
  // Se a peça que se moveu caiu em uma casa do percurso comum que já tem uma peça adversária,
  // essa peça adversária é capturada e volta para a base (-1).
  const movedToken = newTokens.find(t => t.color === tokenToMove.color && t.id === tokenToMove.id)!;
  
  if (movedToken.position !== -1 && movedToken.position < 100) {
    for (let i = 0; i < newTokens.length; i++) {
      const other = newTokens[i];
      if (
        other.color !== movedToken.color && 
        other.position === movedToken.position
      ) {
        // Captura! Manda de volta para a base
        newTokens[i] = { ...other, position: -1 };
      }
    }
  }

  // Verifica se há vitória (todas as 4 peças de uma cor chegaram no 105)
  let winnerColor: LudoColor | null = null;
  const isRedWinner = newTokens.filter(t => t.color === 'red' && t.position === 105).length === 4;
  const isGreenWinner = newTokens.filter(t => t.color === 'green' && t.position === 105).length === 4;

  if (isRedWinner) winnerColor = 'red';
  else if (isGreenWinner) winnerColor = 'green';

  return {
    ...board,
    tokens: newTokens,
    diceValue: null,
    hasRolled: false,
    winnerColor
  };
}

// Algoritmo de Inteligência Artificial para o Computador no Ludo (Verde / Player 2)
// Heurística baseada em prioridade de ações:
// 1. Matar/Capturar peça adversária (Prioridade 1)
// 2. Colocar peça em jogo ao tirar 6 da base (Prioridade 2)
// 3. Salvar uma peça própria de ser comida ou avançar a peça mais perto de vencer (Prioridade 3)
export function getBestLudoMove(board: LudoBoardState, diceValue: number, aiColor: LudoColor = 'green'): LudoToken | null {
  const validTokens = board.tokens.filter(t => t.color === aiColor && canLudoTokenMove(t, diceValue));
  if (validTokens.length === 0) return null;

  // Heurística: Simula cada movimento possível e atribui uma nota
  let bestToken: LudoToken | null = null;
  let maxScore = -9999;

  for (const token of validTokens) {
    let score = 0;

    // 1. Se pode sair da base
    if (token.position === -1 && diceValue === 6) {
      score += 500;
    }

    // Simula a nova posição
    const simulatedBoard = applyLudoMove({ ...board, tokens: board.tokens.map(t => ({ ...t })) }, token, diceValue);
    const newPos = simulatedBoard.tokens.find(t => t.color === aiColor && t.id === token.id)!.position;

    // 2. Se comeu alguém (captura)
    const opponentColor: LudoColor = aiColor === 'red' ? 'green' : 'red';
    const originalOpponentsInBase = board.tokens.filter(t => t.color === opponentColor && t.position === -1).length;
    const newOpponentsInBase = simulatedBoard.tokens.filter(t => t.color === opponentColor && t.position === -1).length;

    if (newOpponentsInBase > originalOpponentsInBase) {
      score += 1000; // Alta prioridade para captura
    }

    // 3. Se avançou rumo ao fim
    if (newPos >= 100) {
      score += 200 + (newPos - 100) * 50; // Prefere colocar peças na zona segura/final
    } else {
      score += newPos * 2; // Prefere avançar peças mais à frente
    }

    if (score > maxScore) {
      maxScore = score;
      bestToken = token;
    }
  }

  return bestToken || validTokens[0];
}
