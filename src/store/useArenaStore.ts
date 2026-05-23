import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, where, getDocs, deleteDoc, arrayUnion } from 'firebase/firestore';

export type GameType = 'chess' | 'checkers' | 'connect4';
export type MatchStatus = 'waiting' | 'playing' | 'declined' | 'finished';

export interface GameMatch {
  id: string;
  gameType: GameType;
  player1Id: string;
  player1Name: string;
  player1Photo?: string;
  player2Id: string;
  player2Name: string;
  player2Photo?: string;
  status: MatchStatus;
  turn: string; // ID do jogador ativo
  boardState: any; // Matriz ou objeto de estado do tabuleiro
  moves: string[];
  winnerId?: string;
  isVoiceActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ArenaState {
  activeMatch: GameMatch | null;
  receivedInvite: GameMatch | null;
  sentInvite: GameMatch | null;
  onlinePlayers: { uid: string; displayName: string; photoURL?: string; presenceStatus?: string }[];
  matchHistory: { id: string; gameType: GameType; opponentName: string; result: 'win' | 'loss' | 'draw'; date: number }[];
  loading: boolean;
  
  // Actions
  setOnlinePlayers: (players: any[]) => void;
  createMatchInvite: (opponentId: string, opponentName: string, opponentPhoto: string | undefined, gameType: GameType, currentUser: { uid: string; displayName: string; photoURL?: string }) => Promise<void>;
  acceptInvite: (match: GameMatch) => Promise<void>;
  declineInvite: (matchId: string) => Promise<void>;
  cancelSentInvite: () => Promise<void>;
  makeMove: (boardState: any, moveStr?: string, winnerId?: string) => Promise<void>;
  listenToMatch: (matchId: string) => () => void;
  listenToInvites: (uid: string) => () => void;
  exitActiveMatch: () => void;
  toggleVoice: () => Promise<void>;
}

export const useArenaStore = create<ArenaState>((set, get) => {
  let matchUnsubscribe: (() => void) | null = null;
  let invitesUnsubscribe: (() => void) | null = null;

  return {
    activeMatch: null,
    receivedInvite: null,
    sentInvite: null,
    onlinePlayers: [],
    matchHistory: [],
    loading: false,

    setOnlinePlayers: (players) => set({ onlinePlayers: players }),

    createMatchInvite: async (opponentId, opponentName, opponentPhoto, gameType, currentUser) => {
      set({ loading: true });
      try {
        const matchId = `${currentUser.uid}_${opponentId}_${Date.now()}`;
        const initialMatch: GameMatch = {
          id: matchId,
          gameType,
          player1Id: currentUser.uid,
          player1Name: currentUser.displayName || 'Jogador A',
          player1Photo: currentUser.photoURL,
          player2Id: opponentId,
          player2Name: opponentName,
          player2Photo: opponentPhoto,
          status: 'waiting',
          turn: currentUser.uid,
          boardState: null, // Definido na inicialização do jogo ao aceitar
          moves: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await setDoc(doc(db, 'matches', matchId), initialMatch);
        set({ sentInvite: initialMatch, loading: false });

        // Começa a escutar esta partida específica para quando o oponente aceitar
        get().listenToMatch(matchId);
      } catch (err) {
        console.error('Erro ao enviar convite:', err);
        set({ loading: false });
      }
    },

    acceptInvite: async (match) => {
      try {
        const docRef = doc(db, 'matches', match.id);
        
        // Define o estado inicial padrão de acordo com o jogo
        let boardState: any = null;
        if (match.gameType === 'connect4') {
          // Grade 7 colunas por 6 linhas (vazias)
          boardState = Array(6).fill(null).map(() => Array(7).fill(null));
        } else if (match.gameType === 'checkers') {
          // Tabuleiro de Damas inicial (8x8)
          // R = vermelhas (jogador 1), P = pretas (jogador 2)
          boardState = Array(8).fill(null).map(() => Array(8).fill(null));
          // Preencher jogador 1 (linhas 0, 1, 2 nas casas pretas)
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) boardState[r][c] = { player: 1, type: 'normal' };
            }
          }
          // Preencher jogador 2 (linhas 5, 6, 7 nas casas pretas)
          for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) boardState[r][c] = { player: 2, type: 'normal' };
            }
          }
        } else if (match.gameType === 'chess') {
          // Tabuleiro de Xadrez inicial em FEN simplificado ou objeto completo
          boardState = {
            pieces: {
              // Peças brancas (Jogador 1) - Linhas 0 e 1 no estado simples ou posições reais
              '0,0': { player: 2, type: 'rook' }, '0,1': { player: 2, type: 'knight' }, '0,2': { player: 2, type: 'bishop' }, '0,3': { player: 2, type: 'queen' },
              '0,4': { player: 2, type: 'king' }, '0,5': { player: 2, type: 'bishop' }, '0,6': { player: 2, type: 'knight' }, '0,7': { player: 2, type: 'rook' },
              '1,0': { player: 2, type: 'pawn' }, '1,1': { player: 2, type: 'pawn' }, '1,2': { player: 2, type: 'pawn' }, '1,3': { player: 2, type: 'pawn' },
              '1,4': { player: 2, type: 'pawn' }, '1,5': { player: 2, type: 'pawn' }, '1,6': { player: 2, type: 'pawn' }, '1,7': { player: 2, type: 'pawn' },
              
              // Peças pretas (Jogador 2) - Linhas 6 e 7
              '6,0': { player: 1, type: 'pawn' }, '6,1': { player: 1, type: 'pawn' }, '6,2': { player: 1, type: 'pawn' }, '6,3': { player: 1, type: 'pawn' },
              '6,4': { player: 1, type: 'pawn' }, '6,5': { player: 1, type: 'pawn' }, '6,6': { player: 1, type: 'pawn' }, '6,7': { player: 1, type: 'pawn' },
              '7,0': { player: 1, type: 'rook' }, '7,1': { player: 1, type: 'knight' }, '7,2': { player: 1, type: 'bishop' }, '7,3': { player: 1, type: 'queen' },
              '7,4': { player: 1, type: 'king' }, '7,5': { player: 1, type: 'bishop' }, '7,6': { player: 1, type: 'knight' }, '7,7': { player: 1, type: 'rook' }
            },
            castling: { p1: { kingSide: true, queenSide: true }, p2: { kingSide: true, queenSide: true } },
            halfMoves: 0
          };
        }

        const updatedMatch: Partial<GameMatch> = {
          status: 'playing',
          boardState,
          turn: match.player1Id, // Jogador 1 (Criador) sempre começa
          updatedAt: Date.now()
        };

        await updateDoc(docRef, updatedMatch);
        set({ receivedInvite: null });
        get().listenToMatch(match.id);
      } catch (err) {
        console.error('Erro ao aceitar convite:', err);
      }
    },

    declineInvite: async (matchId) => {
      try {
        await updateDoc(doc(db, 'matches', matchId), {
          status: 'declined',
          updatedAt: Date.now()
        });
        set({ receivedInvite: null });
      } catch (err) {
        console.error('Erro ao recusar convite:', err);
      }
    },

    cancelSentInvite: async () => {
      const { sentInvite } = get();
      if (!sentInvite) return;
      try {
        await deleteDoc(doc(db, 'matches', sentInvite.id));
        set({ sentInvite: null });
        if (matchUnsubscribe) {
          matchUnsubscribe();
          matchUnsubscribe = null;
        }
      } catch (err) {
        console.error('Erro ao cancelar convite:', err);
      }
    },

    makeMove: async (boardState, moveStr, winnerId) => {
      const { activeMatch } = get();
      if (!activeMatch) return;
      try {
        const docRef = doc(db, 'matches', activeMatch.id);
        const updates: any = {
          boardState,
          turn: activeMatch.turn === activeMatch.player1Id ? activeMatch.player2Id : activeMatch.player1Id,
          updatedAt: Date.now()
        };

        if (moveStr) {
          updates.moves = arrayUnion(moveStr);
        }

        if (winnerId) {
          updates.status = 'finished';
          updates.winnerId = winnerId;
        }

        await updateDoc(docRef, updates);
      } catch (err) {
        console.error('Erro ao fazer jogada:', err);
      }
    },

    listenToMatch: (matchId) => {
      if (matchUnsubscribe) matchUnsubscribe();

      matchUnsubscribe = onSnapshot(doc(db, 'matches', matchId), (snapshot) => {
        if (snapshot.exists()) {
          const matchData = snapshot.data() as GameMatch;
          
          // Se foi recusado, limpa
          if (matchData.status === 'declined') {
            set({ activeMatch: null, sentInvite: null, receivedInvite: null });
            if (matchUnsubscribe) {
              matchUnsubscribe();
              matchUnsubscribe = null;
            }
            return;
          }

          // Se iniciou, vira a partida ativa
          if (matchData.status === 'playing') {
            set({ activeMatch: matchData, sentInvite: null });
          } else if (matchData.status === 'finished') {
            set({ activeMatch: matchData });
          } else {
            // Caso em espera
            set({ sentInvite: matchData });
          }
        } else {
          // Deletado
          set({ activeMatch: null, sentInvite: null });
        }
      });

      return () => {
        if (matchUnsubscribe) {
          matchUnsubscribe();
          matchUnsubscribe = null;
        }
      };
    },

    listenToInvites: (uid) => {
      if (invitesUnsubscribe) invitesUnsubscribe();

      // Escuta convites enviados a este usuário
      const q = query(
        collection(db, 'matches'),
        where('player2Id', '==', uid),
        where('status', '==', 'waiting')
      );

      invitesUnsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Pega o convite mais recente
          const docData = snapshot.docs[0].data() as GameMatch;
          
          // Só define se não for o próprio jogador enviando para si e se o convite é recente (limite de 1 min)
          if (docData.player1Id !== uid && (Date.now() - docData.createdAt) < 60000) {
            set({ receivedInvite: docData });
          }
        } else {
          set({ receivedInvite: null });
        }
      });

      return () => {
        if (invitesUnsubscribe) {
          invitesUnsubscribe();
          invitesUnsubscribe = null;
        }
      };
    },

    exitActiveMatch: () => {
      if (matchUnsubscribe) {
        matchUnsubscribe();
        matchUnsubscribe = null;
      }
      set({ activeMatch: null, sentInvite: null, receivedInvite: null });
    },

    toggleVoice: async () => {
      const { activeMatch } = get();
      if (!activeMatch) return;
      try {
        await updateDoc(doc(db, 'matches', activeMatch.id), {
          isVoiceActive: !activeMatch.isVoiceActive,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error('Erro ao alternar áudio:', err);
      }
    }
  };
});
