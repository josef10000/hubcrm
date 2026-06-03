// Ludo de 4 Jogadores - Motor de Regras Clássico e Inteligência Artificial Local
// Suporta Vermelho (Jogador 1 / Humano), Verde (CPU), Amarelo (CPU/Multi), Azul (CPU/Multi)

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

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
  red: 0,     // Vermelho sai na casa 0
  green: 13,  // Verde sai na casa 13
  blue: 26,   // Azul sai na casa 26
  yellow: 39  // Amarelo sai na casa 39
};

// Casa limite antes de entrar na reta final
export const LUDO_ENTRY_LIMIT: Record<LudoColor, number> = {
  red: 50,
  green: 11,
  blue: 24,
  yellow: 37
};

// Mapeamento de coordenadas X,Y de cada casa no tabuleiro de Ludo 15x15
export function getLudoCoords(color: LudoColor, token: LudoToken): { x: number; y: number } {
  // Se está na base, posiciona nos ninhos específicos de cada canto
  if (token.position === -1) {
    const offsets = [
      { dx: 0, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 1, dy: 1 }
    ];
    const off = offsets[token.id];
    if (color === 'red') {
      return { x: 2 + off.dx, y: 2 + off.dy }; // Quadrante Superior Esquerdo (Vermelho)
    } else if (color === 'green') {
      return { x: 11 + off.dx, y: 2 + off.dy }; // Quadrante Superior Direito (Verde)
    } else if (color === 'yellow') {
      return { x: 2 + off.dx, y: 11 + off.dy }; // Quadrante Inferior Esquerdo (Amarelo)
    } else {
      return { x: 11 + off.dx, y: 11 + off.dy }; // Quadrante Inferior Direito (Azul)
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
      return { x: 1 + index, y: 7 }; // Reta vermelha (esquerda para direita)
    } else if (color === 'green') {
      return { x: 7, y: 1 + index }; // Reta verde (vertical do topo para baixo)
    } else if (color === 'yellow') {
      return { x: 7, y: 13 - index }; // Reta amarela (vertical de baixo para cima)
    } else {
      return { x: 13 - index, y: 7 }; // Reta azul (direita para esquerda)
    }
  }

  // Posições do circuito comum externo de 52 casas (indexados de 0 a 51)
  const circuitCoords: { x: number; y: number }[] = [
    // Lado esquerdo superior (de esquerda para a direita)
    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
    // Topo esquerdo (subindo verticalmente)
    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
    // Meio topo
    { x: 7, y: 0 },
    // Topo direito (descendo verticalmente)
    { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
    // Lado direito superior (indo pra direita)
    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
    // Meio direito
    { x: 14, y: 7 },
    // Lado direito inferior (voltando para a esquerda)
    { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
    // Lado inferior direito (descendo verticalmente)
    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
    // Meio inferior
    { x: 7, y: 14 },
    // Lado inferior esquerdo (subindo verticalmente)
    { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
    // Lado esquerdo inferior (voltando para a esquerda)
    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
    // Meio esquerdo
    { x: 0, y: 7 },
    // Primeira casa de todas
    { x: 0, y: 6 }
  ];

  return circuitCoords[token.position % 52] || { x: 0, y: 0 };
}

// Cria o estado inicial padrão de uma partida de Ludo com 4 cores de fichas!
export function createInitialLudoState(): LudoBoardState {
  const tokens: LudoToken[] = [];
  const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
  
  for (const color of colors) {
    for (let i = 0; i < 4; i++) {
      tokens.push({ id: i, color, position: -1 });
    }
  }

  return {
    tokens,
    diceValue: null,
    hasRolled: false,
    consecutiveSixes: 0,
    winnerColor: null
  };
}

// Casas seguras oficiais: Saídas (0, 13, 26, 39) e Estrelas (8, 21, 34, 47)
export const LUDO_SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];

// Verifica se há uma barreira (2 ou mais peças da mesma cor) na posição especificada
export function isBarrierAt(board: LudoBoardState, position: number, color: LudoColor): boolean {
  if (position === -1 || position === 105) return false;
  const count = board.tokens.filter(t => t.color === color && t.position === position).length;
  return count >= 2;
}

// Verifica se há qualquer barreira (de qualquer cor) na posição especificada
export function hasAnyBarrierAt(board: LudoBoardState, position: number): boolean {
  const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
  return colors.some(color => isBarrierAt(board, position, color));
}

// Retorna se um token específico pode se mover com o valor do dado rolado, simulando barreiras no caminho
export function canLudoTokenMove(board: LudoBoardState, token: LudoToken, diceValue: number): boolean {
  // 1. Se está na base, precisa de 6 para sair
  if (token.position === -1) {
    if (diceValue !== 6) return false;
    // Ao sair da base, vai para a posição de início da sua cor
    const startPos = LUDO_START_POSITION[token.color];
    // Se a casa de saída tiver qualquer barreira, o peão fica bloqueado
    return !hasAnyBarrierAt(board, startPos);
  }

  // 2. Se já chegou ao fim, não se move
  if (token.position === 105) {
    return false;
  }

  // 3. Se está no caminho final, precisa do valor exato para chegar ao 105 e não pode ter barreira no caminho
  if (token.position >= 100) {
    const spacesLeft = 105 - token.position;
    if (diceValue > spacesLeft) return false;
    
    // Verificar se há barreiras na reta final
    for (let p = token.position + 1; p <= token.position + diceValue; p++) {
      if (hasAnyBarrierAt(board, p)) return false;
    }
    return true;
  }

  // 4. No caminho comum, avança passo a passo verificando barreiras
  const entryLimit = LUDO_ENTRY_LIMIT[token.color];
  let currPos = token.position;
  let stepCount = 0;

  while (stepCount < diceValue) {
    if (currPos === entryLimit) {
      // Entra na reta final. O resto do caminho é simulado na reta final
      const remainingSteps = diceValue - stepCount;
      const destInHome = 100 + remainingSteps - 1;
      if (destInHome > 105) return false;
      for (let p = 100; p <= destInHome; p++) {
        if (hasAnyBarrierAt(board, p)) return false;
      }
      return true;
    }
    currPos = (currPos + 1) % 52;
    if (hasAnyBarrierAt(board, currPos)) {
      return false; // Bloqueado por barreira no percurso
    }
    stepCount++;
  }

  return true;
}

// Retorna as jogadas válidas de um jogador baseado no dado atual
export function getLudoValidMoves(board: LudoBoardState, color: LudoColor): LudoToken[] {
  if (board.diceValue === null) return [];
  return board.tokens.filter(t => t.color === color && canLudoTokenMove(board, t, board.diceValue!));
}

// Aplica o movimento a uma peça no Ludo
export function applyLudoMove(board: LudoBoardState, tokenToMove: LudoToken, diceValue: number): LudoBoardState {
  const newTokens = board.tokens.map(t => {
    if (t.color === tokenToMove.color && t.id === tokenToMove.id) {
      const copy = { ...t };
      
      // Caso 1: Sair da Base com 6
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

  // Lógica de Captura ("Comer")
  // Se caímos em uma casa comum ocupada por fichas inimigas (e não for casa segura), mandamos elas de volta para a base (-1)
  const movedToken = newTokens.find(t => t.color === tokenToMove.color && t.id === tokenToMove.id)!;
  
  if (movedToken.position !== -1 && movedToken.position < 100) {
    const isSafePosition = LUDO_SAFE_POSITIONS.includes(movedToken.position);
    if (!isSafePosition) {
      for (let i = 0; i < newTokens.length; i++) {
        const other = newTokens[i];
        if (
          other.color !== movedToken.color && 
          other.position === movedToken.position
        ) {
          // Encontrou inimigo: manda de volta
          newTokens[i] = { ...other, position: -1 };
        }
      }
    }
  }

  // Verifica se há vitória (todas as 4 peças de uma cor chegaram no 105)
  let winnerColor: LudoColor | null = null;
  const colors: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
  for (const color of colors) {
    const wins = newTokens.filter(t => t.color === color && t.position === 105).length;
    if (wins === 4) {
      winnerColor = color;
      break;
    }
  }

  return {
    ...board,
    tokens: newTokens,
    diceValue: null,
    hasRolled: false,
    winnerColor
  };
}

// Algoritmo de IA heurístico para os oponentes virtuais
export function getBestLudoMove(board: LudoBoardState, diceValue: number, aiColor: LudoColor): LudoToken | null {
  const validTokens = board.tokens.filter(t => t.color === aiColor && canLudoTokenMove(board, t, diceValue));
  if (validTokens.length === 0) return null;

  let bestToken: LudoToken | null = null;
  let maxScore = -9999;

  for (const token of validTokens) {
    let score = 0;

    // Sair da base
    if (token.position === -1 && diceValue === 6) {
      score += 500;
    }

    const simulatedBoard = applyLudoMove({ ...board, tokens: board.tokens.map(t => ({ ...t })) }, token, diceValue);
    const newPos = simulatedBoard.tokens.find(t => t.color === aiColor && t.id === token.id)!.position;

    // Capturas
    const originalInBase = board.tokens.filter(t => t.color !== aiColor && t.position === -1).length;
    const newInBase = simulatedBoard.tokens.filter(t => t.color !== aiColor && t.position === -1).length;

    if (newInBase > originalInBase) {
      score += 1200; // Capturar é prioridade máxima
    }

    // Reta final
    if (newPos >= 100) {
      score += 300 + (newPos - 100) * 80;
    } else {
      score += newPos * 2.5;
    }

    if (score > maxScore) {
      maxScore = score;
      bestToken = token;
    }
  }

  return bestToken || validTokens[0];
}
