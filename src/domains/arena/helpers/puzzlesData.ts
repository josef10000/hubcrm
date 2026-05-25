import { GameType } from '@store/useArenaStore';

export interface DailyPuzzleData {
  id: string;
  gameType: 'chess' | 'connect4';
  title: string;
  description: string;
  hint: string;
  initialBoardState: any;
  // Para xadrez: { from: '4,4', to: '1,4' }
  // Para connect4: { toCol: 3 }
  targetMove: {
    from?: string;
    to?: string;
    toCol?: number;
  };
}

export const DAILY_PUZZLES: DailyPuzzleData[] = [
  {
    id: 'chess_p1',
    gameType: 'chess',
    title: 'O Beijo da Morte',
    description: 'O rei adversário está encurralado na última fileira por seus próprios peões. Dê xeque-mate em 1 lance usando a sua Dama!',
    hint: 'Mova a Dama Branca para bem pertinho do Rei Preto, onde ela esteja protegida pelo seu próprio Rei.',
    initialBoardState: {
      pieces: {
        '0,4': { player: 2, type: 'king' },
        '1,3': { player: 2, type: 'pawn' },
        '1,4': { player: 2, type: 'pawn' },
        '1,5': { player: 2, type: 'pawn' },
        '2,4': { player: 1, type: 'king' },
        '4,4': { player: 1, type: 'queen' }
      }
    },
    targetMove: {
      from: '4,4',
      to: '1,4'
    }
  },
  {
    id: 'connect4_p1',
    gameType: 'connect4',
    title: 'Vitória Expressa',
    description: 'Você está jogando com as fichas do Jogador 1 (Ciano). Alinhe 4 peças na horizontal e garanta a vitória imediata neste lance!',
    hint: 'Olhe a linha inferior do tabuleiro. Três peças suas já estão alinhadas. Onde falta a quarta?',
    initialBoardState: [
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [1, 1, 1, null, 2, 2, 2]
    ],
    targetMove: {
      toCol: 3
    }
  },
  {
    id: 'chess_p2',
    gameType: 'chess',
    title: 'O Garfo Duplo Real',
    description: 'Use a agilidade do seu Cavalo para dar um duplo (garfo) simultâneo atacando o Rei e a Dama adversária!',
    hint: 'Procure uma casa que fique a duas linhas e uma coluna (ou vice-versa) de distância de ambos os alvos.',
    initialBoardState: {
      pieces: {
        '0,2': { player: 2, type: 'king' },
        '0,6': { player: 2, type: 'queen' },
        '3,3': { player: 1, type: 'knight' },
        '7,7': { player: 1, type: 'king' }
      }
    },
    targetMove: {
      from: '3,3',
      to: '1,4'
    }
  },
  {
    id: 'connect4_p2',
    gameType: 'connect4',
    title: 'Muralha de Proteção',
    description: 'Atenção! O oponente (Fichas Rosas) está a apenas um lance de alinhar 4 peças na vertical na coluna 5. Bloqueie-o antes que seja tarde!',
    hint: 'Solte a sua ficha na mesma coluna em que o adversário empilhou 3 peças.',
    initialBoardState: [
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, 2, null],
      [null, null, null, null, null, 2, null],
      [1, 1, null, null, null, 2, null]
    ],
    targetMove: {
      toCol: 5
    }
  }
];

export function getDailyPuzzle(dateKey: string): DailyPuzzleData {
  // Pega um puzzle consistente com base no hash do dia do mês
  const dayStr = dateKey.split('-')[2] || '1';
  const dayNum = parseInt(dayStr, 10) || 1;
  const idx = dayNum % DAILY_PUZZLES.length;
  return DAILY_PUZZLES[idx];
}
