import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, arrayUnion, or } from 'firebase/firestore';
import { Tournament } from '@/types';
import { toast } from 'sonner';

export type GameType = 'chess' | 'checkers' | 'connect4' | 'ludo';
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
  player3Id?: string;
  player3Name?: string;
  player3Photo?: string;
  player4Id?: string;
  player4Name?: string;
  player4Photo?: string;
  playersAccepted?: string[];
  status: MatchStatus;
  turn: string; // ID do jogador ativo ou cor ('red'|'green'|'yellow'|'blue') no Ludo
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
  tournaments: Tournament[];
  loading: boolean;
  
  // Actions
  setOnlinePlayers: (players: any[]) => void;
  createMatchInvite: (opponentId: string, opponentName: string, opponentPhoto: string | undefined, gameType: GameType, currentUser: { uid: string; displayName: string; photoURL?: string }) => Promise<void>;
  createLudoLobby: (invitedPlayers: { uid: string; displayName: string; photoURL?: string }[], currentUser: { uid: string; displayName: string; photoURL?: string }) => Promise<void>;
  acceptInvite: (match: GameMatch) => Promise<void>;
  acceptLudoInvite: (matchId: string, uid: string) => Promise<void>;
  declineInvite: (matchId: string) => Promise<void>;
  rejectLudoInvite: (matchId: string, uid: string) => Promise<void>;
  cancelSentInvite: () => Promise<void>;
  startLudoMatch: (matchId: string) => Promise<void>;
  makeMove: (boardState: any, moveStr?: string, winnerId?: string, nextTurnOverride?: string) => Promise<void>;
  listenToMatch: (matchId: string) => () => void;
  listenToInvites: (uid: string) => () => void;
  exitActiveMatch: () => void;
  toggleVoice: () => Promise<void>;
  unlockAchievement: (uid: string, achievementId: string, title: string, description: string, icon: string) => Promise<void>;
  addArenaCredits: (uid: string, amount: number) => Promise<void>;
  purchaseCosmetic: (uid: string, itemId: string, itemType: 'frame' | 'title', cost: number) => Promise<void>;
  equipCosmetic: (uid: string, itemId: string, itemType: 'frame' | 'title') => Promise<void>;
  listenToTournaments: (orgId: string) => () => void;
  createTournament: (orgId: string, name: string, gameType: GameType, maxPlayers: 4 | 8) => Promise<void>;
  registerInTournament: (tournamentId: string, uid: string, displayName: string) => Promise<void>;
  startTournamentMatch: (tournamentId: string, roundKey: 'quarterfinals' | 'semifinals' | 'final', matchIdx: number, p1Id: string, p1Name: string, p2Id: string, p2Name: string, gameType: GameType) => Promise<void>;
  advanceTournamentBracket: (tournamentId: string, roundKey: 'quarterfinals' | 'semifinals' | 'final', matchIdx: number, winnerId: string) => Promise<void>;
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
    tournaments: [],
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

    createLudoLobby: async (invitedPlayers, currentUser) => {
      set({ loading: true });
      try {
        const matchId = `ludo_${currentUser.uid}_${Date.now()}`;
        
        // Mapeia os slots. player1 é o host. player2, player3, player4 são preenchidos por convidados ou 'computer'
        const players = [
          { uid: currentUser.uid, displayName: currentUser.displayName || 'Jogador A', photoURL: currentUser.photoURL },
          ...invitedPlayers
        ];
        
        // Garante que o array tenha tamanho 4 preenchendo com 'computer'
        while (players.length < 4) {
          players.push({
            uid: 'computer',
            displayName: 'CPU 🤖',
            photoURL: undefined
          });
        }
        
        const initialMatch: GameMatch = {
          id: matchId,
          gameType: 'ludo',
          player1Id: players[0].uid,
          player1Name: players[0].displayName,
          player1Photo: players[0].photoURL,
          player2Id: players[1].uid,
          player2Name: players[1].displayName,
          player2Photo: players[1].photoURL,
          player3Id: players[2].uid,
          player3Name: players[2].displayName,
          player3Photo: players[2].photoURL,
          player4Id: players[3].uid,
          player4Name: players[3].displayName,
          player4Photo: players[3].photoURL,
          status: 'waiting',
          turn: 'red', // O turno no Ludo online será a COR ('red' | 'green' | 'yellow' | 'blue')
          playersAccepted: [currentUser.uid], // O Host já aceitou
          boardState: null,
          moves: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await setDoc(doc(db, 'matches', matchId), initialMatch);
        set({ sentInvite: initialMatch, loading: false });
        
        // Começa a escutar a partida
        get().listenToMatch(matchId);
      } catch (err) {
        console.error('Erro ao criar lobby de Ludo:', err);
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
        } else if (match.gameType === 'ludo') {
          const tokens = [];
          const colors = ['red', 'green', 'yellow', 'blue'];
          for (const color of colors) {
            for (let i = 0; i < 4; i++) {
              tokens.push({ id: i, color, position: -1 });
            }
          }
          boardState = {
            tokens,
            diceValue: null,
            hasRolled: false,
            consecutiveSixes: 0,
            winnerColor: null
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

    acceptLudoInvite: async (matchId, uid) => {
      try {
        const docRef = doc(db, 'matches', matchId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        const matchData = docSnap.data();
        const playersAccepted = matchData.playersAccepted || [];
        if (!playersAccepted.includes(uid)) {
          playersAccepted.push(uid);
        }
        
        await updateDoc(docRef, {
          playersAccepted,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error('Erro ao aceitar convite de Ludo:', err);
      }
    },

    rejectLudoInvite: async (matchId, uid) => {
      try {
        const docRef = doc(db, 'matches', matchId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        const matchData = docSnap.data();
        const updates: any = {
          updatedAt: Date.now()
        };
        
        if (matchData.player2Id === uid) {
          updates.player2Id = 'computer';
          updates.player2Name = 'CPU 🤖';
          updates.player2Photo = null;
        } else if (matchData.player3Id === uid) {
          updates.player3Id = 'computer';
          updates.player3Name = 'CPU 🤖';
          updates.player3Photo = null;
        } else if (matchData.player4Id === uid) {
          updates.player4Id = 'computer';
          updates.player4Name = 'CPU 🤖';
          updates.player4Photo = null;
        }
        
        await updateDoc(docRef, updates);
        set({ receivedInvite: null });
      } catch (err) {
        console.error('Erro ao recusar convite de Ludo:', err);
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

    startLudoMatch: async (matchId) => {
      try {
        const docRef = doc(db, 'matches', matchId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        const matchData = docSnap.data();
        
        // Inicializa o estado do tabuleiro de Ludo
        const tokens = [];
        const colors = ['red', 'green', 'yellow', 'blue'];
        for (const color of colors) {
          for (let i = 0; i < 4; i++) {
            tokens.push({ id: i, color, position: -1 });
          }
        }
        
        const boardState = {
          tokens,
          diceValue: null,
          hasRolled: false,
          consecutiveSixes: 0,
          winnerColor: null
        };
        
        await updateDoc(docRef, {
          status: 'playing',
          boardState,
          turn: 'red', // O vermelho (player1 / Host) sempre começa
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error('Erro ao iniciar partida de Ludo:', err);
      }
    },

    makeMove: async (boardState, moveStr, winnerId, nextTurnOverride) => {
      const { activeMatch } = get();
      if (!activeMatch) return;
      try {
        const docRef = doc(db, 'matches', activeMatch.id);
        let nextTurn = nextTurnOverride || activeMatch.turn;
        
        if (!nextTurnOverride) {
          if (boardState && boardState.players && boardState.players.length > 0) {
            const playersList = boardState.players;
            const currentIdx = playersList.findIndex((p: any) => p.id === activeMatch.turn);
            const nextIdx = (currentIdx + 1) % playersList.length;
            nextTurn = playersList[nextIdx].id;
          } else {
            nextTurn = activeMatch.turn === activeMatch.player1Id ? activeMatch.player2Id : activeMatch.player1Id;
          }
        }

        const updates: any = {
          boardState,
          turn: nextTurn,
          updatedAt: Date.now()
        };

        if (moveStr) {
          updates.moves = arrayUnion(moveStr);
        }

        if (winnerId) {
          updates.status = 'finished';
          updates.winnerId = winnerId;

          // Se for partida de torneio, avança no bracket automaticamente
          if (activeMatch.id.startsWith('tournament_')) {
            const parts = activeMatch.id.split('_');
            if (parts.length >= 5) {
              const tournamentId = parts[1];
              const roundKey = parts[2] as 'quarterfinals' | 'semifinals' | 'final';
              const matchIdx = parseInt(parts[3]);
              
              await get().advanceTournamentBracket(tournamentId, roundKey, matchIdx, winnerId);
            }
          }
        }

        await updateDoc(docRef, updates);
      } catch (err) {
        console.error('Erro ao fazer jogada:', err);
      }
    },

    listenToMatch: (matchId) => {
      if (matchUnsubscribe) matchUnsubscribe();

      matchUnsubscribe = onSnapshot(doc(db, 'matches', matchId), 
        (snapshot) => {
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
        },
        (error) => {
          console.warn('Firestore: escuta de partida desativada por seguranca:', error.message);
        }
      );

      return () => {
        if (matchUnsubscribe) {
          matchUnsubscribe();
          matchUnsubscribe = null;
        }
      };
    },

    listenToInvites: (uid) => {
      if (invitesUnsubscribe) invitesUnsubscribe();

      // Escuta convites enviados a este usuário (como player2, player3 ou player4)
      const q = query(
        collection(db, 'matches'),
        where('status', '==', 'waiting'),
        or(
          where('player2Id', '==', uid),
          where('player3Id', '==', uid),
          where('player4Id', '==', uid)
        ) as any
      );

      invitesUnsubscribe = onSnapshot(q, 
        (snapshot) => {
          if (!snapshot.empty) {
            // Pega o convite mais recente
            const docData = snapshot.docs[0].data() as GameMatch;
            const playersAccepted = docData.playersAccepted || [];
            
            // Só define se não for o próprio jogador enviando para si, se o convite é recente (limite de 5 min)
            // e se o jogador atual ainda não aceitou a partida
            if (
              docData.player1Id !== uid && 
              (Date.now() - docData.createdAt) < 300000 &&
              !playersAccepted.includes(uid)
            ) {
              set({ receivedInvite: docData });
            }
          } else {
            set({ receivedInvite: null });
          }
        },
        (error) => {
          console.warn('Firestore: escuta de convites desativada por seguranca:', error.message);
        }
      );

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
    },
    
    unlockAchievement: async (uid, achievementId, title, description, icon) => {
      try {
        const userAchievementsRef = doc(db, 'arenaAchievements', uid);
        await setDoc(userAchievementsRef, {
          unlocked: arrayUnion({
            id: achievementId,
            title,
            description,
            icon,
            unlockedAt: Date.now()
          })
        }, { merge: true });

        // Dar 50 moedas virtuais por conquista
        const userRef = doc(db, 'profiles', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentCredits = userSnap.data().arenaCredits || 0;
          await updateDoc(userRef, {
            arenaCredits: currentCredits + 50
          });
        }
      } catch (err) {
        console.error('Erro ao salvar conquista no Firestore:', err);
      }
    },
    
    addArenaCredits: async (uid, amount) => {
      try {
        const userRef = doc(db, 'profiles', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentCredits = userSnap.data().arenaCredits || 0;
          await updateDoc(userRef, {
            arenaCredits: currentCredits + amount
          });
        }
      } catch (err) {
        console.error('Erro ao adicionar moedas:', err);
      }
    },

    purchaseCosmetic: async (uid, itemId, itemType, cost) => {
      try {
        const userRef = doc(db, 'profiles', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('Usuário não encontrado');

        const userData = userSnap.data();
        const currentCredits = userData.arenaCredits || 0;

        if (currentCredits < cost) {
          throw new Error('Créditos insuficientes');
        }

        const updates: any = {
          arenaCredits: currentCredits - cost
        };

        if (itemType === 'frame') {
          const unlockedFrames = userData.unlockedFrames || ['none'];
          if (unlockedFrames.includes(itemId)) {
            throw new Error('Cosmético já desbloqueado');
          }
          updates.unlockedFrames = arrayUnion(itemId);
        } else if (itemType === 'title') {
          const unlockedTitles = userData.unlockedTitles || [];
          if (unlockedTitles.includes(itemId)) {
            throw new Error('Título já desbloqueado');
          }
          updates.unlockedTitles = arrayUnion(itemId);
        }

        await updateDoc(userRef, updates);
      } catch (err: any) {
        console.error('Erro ao comprar cosmético:', err);
        throw err;
      }
    },

    equipCosmetic: async (uid, itemId, itemType) => {
      try {
        const userRef = doc(db, 'profiles', uid);
        const updates: any = {};
        if (itemType === 'frame') {
          updates.avatarFrame = itemId;
        } else if (itemType === 'title') {
          updates.activeTitle = itemId;
        }
        await updateDoc(userRef, updates);
      } catch (err) {
        console.error('Erro ao equipar cosmético:', err);
      }
    },

    listenToTournaments: (orgId) => {
      const q = query(
        collection(db, 'tournaments'),
        where('orgId', '==', orgId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        set({ tournaments: list });
      }, (err) => {
        console.warn('Firestore: escuta de torneios indisponível:', err.message);
      });

      return unsubscribe;
    },

    createTournament: async (orgId, name, gameType, maxPlayers) => {
      try {
        const id = `tournament_${Date.now()}`;
        const newTour: Tournament = {
          id,
          name,
          gameType,
          status: 'registration',
          maxPlayers,
          participants: [],
          bracket: {
            semifinals: Array(2).fill(null).map(() => ({ matchId: null, p1: null, p2: null, winnerId: null })),
            final: { matchId: null, p1: null, p2: null, winnerId: null }
          },
          orgId,
          createdAt: Date.now()
        };

        if (maxPlayers === 8) {
          newTour.bracket.quarterfinals = Array(4).fill(null).map(() => ({ matchId: null, p1: null, p2: null, winnerId: null }));
        }

        await setDoc(doc(db, 'tournaments', id), newTour);
        toast.success('Torneio criado e aberto para inscrições!');
      } catch (err) {
        console.error('Erro ao criar torneio:', err);
        toast.error('Erro ao criar torneio.');
      }
    },

    registerInTournament: async (tournamentId, uid, displayName) => {
      try {
        const tourRef = doc(db, 'tournaments', tournamentId);
        const tourSnap = await getDoc(tourRef);
        if (!tourSnap.exists()) return;

        const tourData = tourSnap.data() as Tournament;
        if (tourData.status !== 'registration') {
          throw new Error('Inscrições encerradas para este torneio');
        }

        if (tourData.participants.includes(uid)) {
          throw new Error('Você já está inscrito');
        }

        const participants = [...tourData.participants, uid];
        const updates: any = { participants };

        // Ao preencher todas as vagas, inicia o torneio e sorteia os confrontos
        if (participants.length === tourData.maxPlayers) {
          updates.status = 'active';

          const shuffled = [...participants].sort(() => Math.random() - 0.5);
          const nameMap: Record<string, string> = {};
          
          for (const pId of shuffled) {
            const pSnap = await getDoc(doc(db, 'profiles', pId));
            nameMap[pId] = pSnap.exists() ? pSnap.data().displayName || 'Jogador' : 'Jogador';
          }

          const bracket = { ...tourData.bracket };

          if (tourData.maxPlayers === 8) {
            bracket.quarterfinals = [];
            for (let i = 0; i < 4; i++) {
              const p1 = shuffled[i * 2];
              const p2 = shuffled[i * 2 + 1];
              bracket.quarterfinals.push({
                matchId: null,
                p1,
                p1Name: nameMap[p1],
                p2,
                p2Name: nameMap[p2],
                winnerId: null
              });
            }
          } else {
            // 4 Jogadores
            bracket.semifinals = [];
            for (let i = 0; i < 2; i++) {
              const p1 = shuffled[i * 2];
              const p2 = shuffled[i * 2 + 1];
              bracket.semifinals.push({
                matchId: null,
                p1,
                p1Name: nameMap[p1],
                p2,
                p2Name: nameMap[p2],
                winnerId: null
              });
            }
          }

          updates.bracket = bracket;
        }

        await updateDoc(tourRef, updates);
        toast.success('Inscrição efetuada com sucesso!');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao realizar inscrição.');
        throw err;
      }
    },

    startTournamentMatch: async (tournamentId, roundKey, matchIdx, p1Id, p1Name, p2Id, p2Name, gameType) => {
      try {
        const matchId = `tournament_${tournamentId}_${roundKey}_${matchIdx}_${Date.now()}`;
        
        let boardState: any = null;
        if (gameType === 'connect4') {
          boardState = Array(6).fill(null).map(() => Array(7).fill(null));
        } else if (gameType === 'checkers') {
          boardState = Array(8).fill(null).map(() => Array(8).fill(null));
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) boardState[r][c] = { player: 1, type: 'normal' };
            }
          }
          for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if ((r + c) % 2 === 1) boardState[r][c] = { player: 2, type: 'normal' };
            }
          }
        } else if (gameType === 'chess') {
          boardState = {
            pieces: {
              '0,0': { player: 2, type: 'rook' }, '0,1': { player: 2, type: 'knight' }, '0,2': { player: 2, type: 'bishop' }, '0,3': { player: 2, type: 'queen' },
              '0,4': { player: 2, type: 'king' }, '0,5': { player: 2, type: 'bishop' }, '0,6': { player: 2, type: 'knight' }, '0,7': { player: 2, type: 'rook' },
              '1,0': { player: 2, type: 'pawn' }, '1,1': { player: 2, type: 'pawn' }, '1,2': { player: 2, type: 'pawn' }, '1,3': { player: 2, type: 'pawn' },
              '1,4': { player: 2, type: 'pawn' }, '1,5': { player: 2, type: 'pawn' }, '1,6': { player: 2, type: 'pawn' }, '1,7': { player: 2, type: 'pawn' },
              '6,0': { player: 1, type: 'pawn' }, '6,1': { player: 1, type: 'pawn' }, '6,2': { player: 1, type: 'pawn' }, '6,3': { player: 1, type: 'pawn' },
              '6,4': { player: 1, type: 'pawn' }, '6,5': { player: 1, type: 'pawn' }, '6,6': { player: 1, type: 'pawn' }, '6,7': { player: 1, type: 'pawn' },
              '7,0': { player: 1, type: 'rook' }, '7,1': { player: 1, type: 'knight' }, '7,2': { player: 1, type: 'bishop' }, '7,3': { player: 1, type: 'queen' },
              '7,4': { player: 1, type: 'king' }, '7,5': { player: 1, type: 'bishop' }, '7,6': { player: 1, type: 'knight' }, '7,7': { player: 1, type: 'rook' }
            },
            castling: { p1: { kingSide: true, queenSide: true }, p2: { kingSide: true, queenSide: true } },
            halfMoves: 0
          };
        } else if (gameType === 'ludo') {
          const tokens = [];
          const colors = ['red', 'green', 'yellow', 'blue'];
          for (const color of colors) {
            for (let i = 0; i < 4; i++) {
              tokens.push({ id: i, color, position: -1 });
            }
          }
          boardState = { tokens, diceValue: null, hasRolled: false, consecutiveSixes: 0, winnerColor: null };
        }

        const initialMatch: GameMatch = {
          id: matchId,
          gameType,
          player1Id: p1Id,
          player1Name: p1Name,
          player2Id: p2Id,
          player2Name: p2Name,
          status: 'playing',
          turn: p1Id,
          boardState,
          moves: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await setDoc(doc(db, 'matches', matchId), initialMatch);

        const tourRef = doc(db, 'tournaments', tournamentId);
        const tourSnap = await getDoc(tourRef);
        if (tourSnap.exists()) {
          const tourData = tourSnap.data() as Tournament;
          const bracket = { ...tourData.bracket };

          if (roundKey === 'quarterfinals' && bracket.quarterfinals) {
            bracket.quarterfinals[matchIdx].matchId = matchId;
          } else if (roundKey === 'semifinals') {
            bracket.semifinals[matchIdx].matchId = matchId;
          } else if (roundKey === 'final') {
            bracket.final.matchId = matchId;
          }

          await updateDoc(tourRef, { bracket });
        }

        set({ activeMatch: initialMatch });
        get().listenToMatch(matchId);
      } catch (err) {
        console.error('Erro ao iniciar partida de torneio:', err);
      }
    },

    advanceTournamentBracket: async (tournamentId, roundKey, matchIdx, winnerId) => {
      try {
        const tourRef = doc(db, 'tournaments', tournamentId);
        const tourSnap = await getDoc(tourRef);
        if (!tourSnap.exists()) return;

        const tourData = tourSnap.data() as Tournament;
        const bracket = { ...tourData.bracket };

        let pName = '';
        const winnerProfileSnap = await getDoc(doc(db, 'profiles', winnerId));
        if (winnerProfileSnap.exists()) {
          pName = winnerProfileSnap.data().displayName || 'Jogador';
        }

        if (roundKey === 'quarterfinals' && bracket.quarterfinals) {
          bracket.quarterfinals[matchIdx].winnerId = winnerId;
          
          const nextMatchIdx = Math.floor(matchIdx / 2);
          const isP1 = matchIdx % 2 === 0;

          if (isP1) {
            bracket.semifinals[nextMatchIdx].p1 = winnerId;
            bracket.semifinals[nextMatchIdx].p1Name = pName;
          } else {
            bracket.semifinals[nextMatchIdx].p2 = winnerId;
            bracket.semifinals[nextMatchIdx].p2Name = pName;
          }
        } else if (roundKey === 'semifinals') {
          bracket.semifinals[matchIdx].winnerId = winnerId;

          const isP1 = matchIdx === 0;
          if (isP1) {
            bracket.final.p1 = winnerId;
            bracket.final.p1Name = pName;
          } else {
            bracket.final.p2 = winnerId;
            bracket.final.p2Name = pName;
          }
        } else if (roundKey === 'final') {
          bracket.final.winnerId = winnerId;

          await updateDoc(tourRef, {
            status: 'finished',
            winnerId,
            bracket
          });

          // Dar 300 moedas de prêmio ao campeão do torneio
          const userRef = doc(db, 'profiles', winnerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const currentCredits = userSnap.data().arenaCredits || 0;
            await updateDoc(userRef, {
              arenaCredits: currentCredits + 300
            });
          }
          toast.success(`Torneio concluído! Campeão: ${pName}! Prêmio de 300 coins concedido.`);
          return;
        }

        await updateDoc(tourRef, { bracket });
      } catch (err) {
        console.error('Erro ao avançar bracket do torneio:', err);
      }
    }
  };
});
