import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { ChessBoardState, ChessMove, ChessPieceType, ChessPiece, getChessValidMoves, applyChessMove, checkChessWinner, getBestChessMove } from '../helpers/chessLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ChessBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// Dicionário de Peças Unicode Estilizadas
const CHESS_PIECES_UNICODE: Record<string, string> = {
  'pawn': '♟', 'knight': '♞', 'bishop': '♝', 'rook': '♜', 'queen': '♛', 'king': '♚'
};

// -----------------------------------------------------------------
// SISTEMA DE ÁUDIO RETRÔ 8-BITS PROCEDURAL (WEB AUDIO API)
// -----------------------------------------------------------------
let chessAudioCtx: AudioContext | null = null;
let chessMusicInterval: any = null;

function stopChessProceduralMusic() {
  if (chessMusicInterval) {
    clearInterval(chessMusicInterval);
    chessMusicInterval = null;
  }
  if (chessAudioCtx) {
    try {
      chessAudioCtx.close();
    } catch (e) {}
    chessAudioCtx = null;
  }
}

function playChessProceduralMusic() {
  stopChessProceduralMusic();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    chessAudioCtx = new AudioContextClass();
    
    // Uma progressão chiptune clássica: C -> G -> Am -> F em arpejos GameBoy
    const arpeggios = [
      [261.63, 329.63, 392.00, 523.25], // C
      [196.00, 246.94, 293.66, 392.00], // G
      [220.00, 261.63, 329.63, 440.00], // Am
      [174.61, 220.00, 261.63, 349.23]  // F
    ];
    let chordIdx = 0;
    let noteIdx = 0;

    const playNote = () => {
      if (!chessAudioCtx || chessAudioCtx.state === 'suspended') return;
      const now = chessAudioCtx.currentTime;
      const chord = arpeggios[chordIdx % arpeggios.length];
      const freq = chord[noteIdx % chord.length];
      
      const osc = chessAudioCtx.createOscillator();
      const gain = chessAudioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.005, now); // extremamente sutil de fundo
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      
      osc.connect(gain);
      gain.connect(chessAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
      
      noteIdx++;
      if (noteIdx % 8 === 0) {
        chordIdx++;
      }
    };
    
    playNote();
    chessMusicInterval = setInterval(playNote, 240);
  } catch (e) {
    console.warn('Erro ao reproduzir chiptune:', e);
  }
}

// Efeitos sonoros Chiptune 8-Bits
function playChessRetroSound(type: 'move' | 'capture' | 'alert' | 'win') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.15);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(450, now + 0.06);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'win') {
      const notes = [
        { f: 261.63, t: 0 }, { f: 329.63, t: 0.08 }, { f: 392.00, t: 0.16 }, { f: 523.25, t: 0.24 }
      ];
      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(0.04, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.2);
      });
    }
  } catch (e) {}
}

// -----------------------------------------------------------------
// SKINS E TEMAS ESTÉTICOS DE LUXO COM MODO CRT RETRÔ
// -----------------------------------------------------------------
type ChessSkin = 'cyberpunk' | 'wood' | 'holographic' | 'arcade';

const THEME_SKINS = {
  cyberpunk: {
    boardBg: 'bg-[#07090f] border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]',
    darkSquare: 'bg-[#151928]',
    lightSquare: 'bg-[#2a3045]',
    p1Piece: 'text-white drop-shadow-[0_2px_6px_rgba(255,255,255,0.45)]',
    p2Piece: 'text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]'
  },
  wood: {
    boardBg: 'bg-[#3b2314] border-[#29170c] shadow-[0_20px_50px_rgba(0,0,0,0.8)]',
    darkSquare: 'bg-[#5e381b]',
    lightSquare: 'bg-[#d7a15c]',
    p1Piece: 'text-[#f5ebd7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
    p2Piece: 'text-[#241205] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]'
  },
  holographic: {
    boardBg: 'bg-[#0f1124] border-indigo-500/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    darkSquare: 'bg-indigo-950/45 border-white/[0.02]',
    lightSquare: 'bg-white/5 border-white/[0.02]',
    p1Piece: 'text-purple-300 drop-shadow-[0_0_10px_rgba(192,132,252,0.65)]',
    p2Piece: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]'
  },
  arcade: {
    boardBg: 'bg-[#120324] border-purple-500/30 shadow-[0_20px_50px_rgba(236,72,153,0.18)] relative overflow-hidden after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] after:bg-[length:100%_4px,3px_100%] after:pointer-events-none after:animate-pulse',
    darkSquare: 'bg-[#2a085c]',
    lightSquare: 'bg-[#4c1c8c]',
    p1Piece: 'text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.85)]',
    p2Piece: 'text-[#ff00ff] drop-shadow-[0_0_8px_rgba(255,0,255,0.85)]'
  }
};

export function ChessBoard({ match, isLocal, aiDifficulty = 3, onExit }: ChessBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);
  const unlockAchievement = useArenaStore(state => state.unlockAchievement);

  // Peças iniciais padrão
  const initialPieces: Record<string, ChessPiece> = {
    '6,0': { player: 1, type: 'pawn' }, '6,1': { player: 1, type: 'pawn' }, '6,2': { player: 1, type: 'pawn' }, '6,3': { player: 1, type: 'pawn' },
    '6,4': { player: 1, type: 'pawn' }, '6,5': { player: 1, type: 'pawn' }, '6,6': { player: 1, type: 'pawn' }, '6,7': { player: 1, type: 'pawn' },
    '7,0': { player: 1, type: 'rook' }, '7,1': { player: 1, type: 'knight' }, '7,2': { player: 1, type: 'bishop' }, '7,3': { player: 1, type: 'queen' },
    '7,4': { player: 1, type: 'king' }, '7,5': { player: 1, type: 'bishop' }, '7,6': { player: 1, type: 'knight' }, '7,7': { player: 1, type: 'rook' },
    
    '0,0': { player: 2, type: 'rook' }, '0,1': { player: 2, type: 'knight' }, '0,2': { player: 2, type: 'bishop' }, '0,3': { player: 2, type: 'queen' },
    '0,4': { player: 2, type: 'king' }, '0,5': { player: 2, type: 'bishop' }, '0,6': { player: 2, type: 'knight' }, '0,7': { player: 2, type: 'rook' },
    '1,0': { player: 2, type: 'pawn' }, '1,1': { player: 2, type: 'pawn' }, '1,2': { player: 2, type: 'pawn' }, '1,3': { player: 2, type: 'pawn' },
    '1,4': { player: 2, type: 'pawn' }, '1,5': { player: 2, type: 'pawn' }, '1,6': { player: 2, type: 'pawn' }, '1,7': { player: 2, type: 'pawn' }
  };

  const [localBoard, setLocalBoard] = useState<ChessBoardState>({ pieces: initialPieces });
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<ChessSkin>('cyberpunk');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Efeitos especiais de reações e partículas
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<{ id: string; color: string; x: number; y: number; dx: number; dy: number }[]>([]);

  const [p1Clock, setP1Clock] = useState(600);
  const [p2Clock, setP2Clock] = useState(600);

  const currentBoard = isLocal ? localBoard : (match.boardState || localBoard) as ChessBoardState;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;
  const myPlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);

  const activePlayerNum = isLocal ? (localTurn === 'computer' ? 2 : 1) : (match.turn === match.player1Id ? 1 : 2);
  const validMoves = getChessValidMoves(currentBoard, activePlayerNum);
  const selectedMoves = selectedCell ? validMoves.filter(m => m.from === selectedCell) : [];

  const theme = THEME_SKINS[currentSkin];

  useEffect(() => {
    return () => {
      stopChessProceduralMusic();
    };
  }, []);

  const playChessSound = (isCapture: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCapture ? 480 : 320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(isCapture ? 200 : 250, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopChessProceduralMusic();
      setIsMusicPlaying(false);
      toast.info('Música ambiente pausada');
    } else {
      playChessProceduralMusic();
      setIsMusicPlaying(true);
      toast.success('Música ambiente procedural ativada 🎵');
    }
  };

  // Dispara explosão visual no Xadrez
  const triggerExplosion = (x: number, y: number, color: string) => {
    const newParticles: any[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const speed = 1.2 + Math.random() * 2;
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        color,
        x: x * 48 + 24, // escala de pixel aproximada para grade 8x8 de 384px
        y: y * 48 + 24,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 750);
  };

  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 50 + Math.random() * 100;
    const newReaction = { id, emoji, x, y: 350 };
    setFloatingEmojis(prev => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(re => re.id !== id));
    }, 2000);
  };

  const checkChessAchievements = (id: string, title: string, desc: string, icon: string) => {
    if (user?.uid) {
      unlockAchievement(user.uid, id, title, desc, icon);
    }
  };

  // Clocks
  useEffect(() => {
    if (winnerPlayer) return;
    const timer = setInterval(() => {
      const activeClock = currentTurn === (isLocal ? user?.uid : match.player1Id) ? 'p1' : 'p2';
      if (activeClock === 'p1') {
        setP1Clock(prev => (prev > 0 ? prev - 1 : 0));
      } else {
        setP2Clock(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTurn, isLocal, user?.uid, match.player1Id, winnerPlayer]);

  useEffect(() => {
    if (p1Clock === 0) {
      setWinnerPlayer(2);
      toast.error('O tempo acabou! As Pretas venceram.');
    } else if (p2Clock === 0) {
      setWinnerPlayer(1);
      toast.success('O tempo acabou! As Brancas venceram.');
    }
  }, [p1Clock, p2Clock]);

  // UX de Clique
  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn || winnerPlayer || isAiThinking) return;

    const cellKey = `${r},${c}`;
    const piece = currentBoard.pieces[cellKey];

    // --- UX PREMIUM: ROQUE INTELIGENTE CLICANDO NA TORRE ALIANÇA ---
    if (selectedCell && piece && piece.player === myPlayerNum && piece.type === 'rook') {
      const selectedPiece = currentBoard.pieces[selectedCell];
      if (selectedPiece && selectedPiece.type === 'king' && selectedPiece.player === myPlayerNum) {
        if (selectedCell === '7,4') {
          if (cellKey === '7,7') {
            const hasMove = selectedMoves.find(m => m.to === '7,6');
            if (hasMove) {
              handleTargetCellClick(7, 6);
              checkChessAchievements('chess_cast', 'A Fortaleza', 'Realizou o movimento de Roque na Hub Arena.', '🏰');
              return;
            }
          } else if (cellKey === '7,0') {
            const hasMove = selectedMoves.find(m => m.to === '7,2');
            if (hasMove) {
              handleTargetCellClick(7, 2);
              checkChessAchievements('chess_cast', 'A Fortaleza', 'Realizou o movimento de Roque na Hub Arena.', '🏰');
              return;
            }
          }
        } else if (selectedCell === '0,4') {
          if (cellKey === '0,7') {
            const hasMove = selectedMoves.find(m => m.to === '0,6');
            if (hasMove) {
              handleTargetCellClick(0, 6);
              checkChessAchievements('chess_cast', 'A Fortaleza', 'Realizou o movimento de Roque na Hub Arena.', '🏰');
              return;
            }
          } else if (cellKey === '0,0') {
            const hasMove = selectedMoves.find(m => m.to === '0,2');
            if (hasMove) {
              handleTargetCellClick(0, 2);
              checkChessAchievements('chess_cast', 'A Fortaleza', 'Realizou o movimento de Roque na Hub Arena.', '🏰');
              return;
            }
          }
        }
      }
    }

    if (piece && piece.player === myPlayerNum) {
      setSelectedCell(cellKey);
    }
  };

  const handleTargetCellClick = async (r: number, c: number) => {
    if (!selectedCell) return;

    const targetKey = `${r},${c}`;
    const targetMove = selectedMoves.find(m => m.to === targetKey);

    if (!targetMove) {
      const piece = currentBoard.pieces[targetKey];
      if (piece && piece.player === myPlayerNum) {
        setSelectedCell(targetKey);
      } else {
        setSelectedCell(null);
      }
      return;
    }

    const nextBoard = applyChessMove(currentBoard, targetMove);
    triggerExplosion(c, r, targetMove.capturedPiece ? '#ef4444' : '#10b981');
    playChessSound(!!targetMove.capturedPiece);
    setSelectedCell(null);

    const winResult = checkChessWinner(nextBoard);

    if (isLocal) {
      setLocalBoard(nextBoard);
      if (winResult) {
        setWinnerPlayer(winResult);
        toast.success('Parabéns! Você venceu a inteligência artificial do Hub! 🏆');
        checkChessAchievements('chess_win', 'Grão-Mestre', 'Venceu a inteligência artificial no Xadrez.', '👑');
        return;
      }
      setLocalTurn('computer');
    } else {
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextBoard, `${targetMove.from}-${targetMove.to}`, winnerUserId);
      if (winResult) {
        toast.success('Vitória e Xeque-mate na Hub Arena!');
        checkChessAchievements('chess_win', 'Grão-Mestre', 'Venceu uma partida de Xadrez na Arena.', '👑');
      }
    }
  };

  // Efeito da IA no Xadrez
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerPlayer) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        const bestMove = getBestChessMove(localBoard, 2);
        
        if (bestMove) {
          const nextBoard = applyChessMove(localBoard, bestMove);
          
          const [toR, toC] = bestMove.to.split(',').map(Number);
          triggerExplosion(toC, toR, bestMove.capturedPiece ? '#ef4444' : '#6366f1');
          playChessSound(!!bestMove.capturedPiece);
          
          setLocalBoard(nextBoard);

          const winResult = checkChessWinner(nextBoard);
          if (winResult) {
            setWinnerPlayer(winResult);
            toast.error('O computador venceu a partida de Xadrez!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        } else {
          setWinnerPlayer(1);
          toast.success('Você venceu por Xeque-mate!');
          checkChessAchievements('chess_win', 'Grão-Mestre', 'Venceu o computador no Xadrez.', '👑');
        }
        setIsAiThinking(false);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localBoard, winnerPlayer, user?.uid]);

  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkChessWinner(match.boardState as ChessBoardState);
      if (winResult) setWinnerPlayer(winResult);
    }
  }, [isLocal, match.boardState]);

  const handleLeaveGame = () => {
    if (isLocal) {
      if (onExit) onExit();
    } else {
      exitActiveMatch();
    }
  };

  const handleRestartLocalGame = () => {
    setLocalBoard({ pieces: initialPieces });
    setLocalTurn(user?.uid || 'player1');
    setSelectedCell(null);
    setWinnerPlayer(null);
    setIsAiThinking(false);
    setP1Clock(600);
    setP2Clock(600);
    toast.success('Partida de Xadrez reiniciada!');
  };

  const formatClock = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getOpponentName = () => {
    if (isLocal) return 'Computador';
    return match.player1Id === user?.uid ? match.player2Name : match.player1Name;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center py-6 select-none animate-in fade-in duration-300 relative">
      
      {/* 📊 PAINEL ESTATÍSTICO DE JOGO (ESQUERDA) */}
      <div className="w-64 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none shadow-2xl z-10">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">Xadrez Estratégico</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        {/* 🎨 SELETOR DE SKINS */}
        <div className="space-y-1.5">
          <span className="text-[7px] font-black text-gray-500 uppercase">Tema do Tabuleiro</span>
          <div className="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
            {(['cyberpunk', 'wood', 'holographic'] as ChessSkin[]).map(skin => (
              <button
                key={skin}
                onClick={() => setCurrentSkin(skin)}
                className={`py-1.5 text-[7px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  currentSkin === skin
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {skin === 'cyberpunk' ? 'Tron' : skin === 'wood' ? 'Madeira' : 'Holog'}
              </button>
            ))}
          </div>
        </div>

        {/* 🎵 BOTÃO DA MÚSICA AMBIENTE */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-gray-500 uppercase">Som da Arena</span>
            <span className="text-[8px] font-bold text-white">Música Lofi</span>
          </div>

          <button
            onClick={toggleMusic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMusicPlaying
              ? 'bg-gradient-to-br from-purple-500 to-rose-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-white/5 text-gray-400 border border-white/5'
            }`}
          >
            {isMusicPlaying ? (
              <div className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 bg-white rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 bg-white rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
                <span className="w-0.5 bg-white rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.5s' }} />
              </div>
            ) : '🎵'}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative overflow-hidden ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-purple-500/10 border-purple-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-purple-400 uppercase">Brancas (Você)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            <span className="text-xs font-black mt-2 text-white font-mono">{formatClock(p1Clock)}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-purple-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative overflow-hidden ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-amber-500 uppercase">Pretas (Metálicas)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            <span className="text-xs font-black mt-2 text-white font-mono">{formatClock(p2Clock)}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-amber-400 uppercase mt-1 animate-pulse">Pensando...</span>
            )}
          </div>
        </div>

        {winnerPlayer && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {winnerPlayer === 1 ? 'BRANCAS VENCERAM!' : 'PRETAS VENCERAM!'}
            </p>
          </div>
        )}

        {isLocal && (
          <button 
            onClick={handleRestartLocalGame}
            className="py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
          >
            🔄 Recomeçar Partida
          </button>
        )}

        <button 
          onClick={handleLeaveGame}
          className="mt-auto py-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-[9px] font-black text-rose-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
        >
          🏳️ Abandonar Arena
        </button>
      </div>

      {/* 👑 TABULEIRO DE XADREZ CIBERNÉTICO (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
        
        {/* REAÇÕES FLUTUANTES */}
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          <AnimatePresence>
            {floatingEmojis.map(re => (
              <motion.div
                key={re.id}
                initial={{ opacity: 0, y: re.y, scale: 0.5, x: re.x }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  y: re.y - 180, 
                  scale: [0.5, 1.2, 1.2, 0.8],
                  x: re.x + Math.sin(re.y) * 15
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute text-4xl select-none"
              >
                {re.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* PARTÍCULAS NEON HSL */}
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
              animate={{ 
                x: p.x + p.dx * 12, 
                y: p.y + p.dy * 12, 
                opacity: 0,
                scale: 0.2
              }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`
              }}
            />
          ))}
        </div>

        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem]">
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-purple-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Xadrez */}
          <div className={`relative z-10 grid grid-rows-8 gap-0.5 w-[384px] h-[384px] p-1.5 overflow-hidden border rounded-2xl ${theme.boardBg}`}>
            {Array(8).fill(null).map((_, rIdx) => (
              <div key={rIdx} className="grid grid-cols-8 gap-0.5">
                {Array(8).fill(null).map((_, cIdx) => {
                  const cellKey = `${rIdx},${cIdx}`;
                  const piece = currentBoard.pieces[cellKey];
                  const isBlackSquare = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedCell === cellKey;
                  
                  const isValidTarget = selectedMoves.find(m => m.to === cellKey);

                  return (
                    <div
                      key={cIdx}
                      onClick={() => piece ? handleCellClick(rIdx, cIdx) : isValidTarget && handleTargetCellClick(rIdx, cIdx)}
                      className={`w-11 h-11 flex items-center justify-center relative select-none cursor-pointer transition-all ${
                        isBlackSquare 
                        ? theme.darkSquare 
                        : theme.lightSquare
                      }`}
                    >
                      {/* Destaque de destino válido */}
                      {isValidTarget && (
                        <div 
                          onClick={() => handleTargetCellClick(rIdx, cIdx)}
                          className="absolute inset-1.5 border-2 border-emerald-500/60 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.35)] z-20 cursor-pointer" 
                        />
                      )}

                      {/* Renderização física e luxuosa da Peça de Xadrez */}
                      {piece && (
                        <motion.div
                          layoutId={`chess-piece-${cellKey}`}
                          onClick={() => piece.player === myPlayerNum ? handleCellClick(rIdx, cIdx) : isValidTarget && handleTargetCellClick(rIdx, cIdx)}
                          className={`w-10 h-10 flex items-center justify-center text-3xl font-bold cursor-pointer transition-all z-10 ${
                            piece.player === 1 ? theme.p1Piece : theme.p2Piece
                          } ${
                            isSelected ? 'scale-110 -translate-y-1 ring-2 ring-primary-500 rounded-lg bg-primary-500/10' : ''
                          }`}
                        >
                          {CHESS_PIECES_UNICODE[piece.type]}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 💬 CHAT DE EMOJIS RÁPIDOS */}
        <div className="flex gap-2 mt-4 bg-slate-950/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-lg">
          {(['😂', '🤔', '😎', '🤯', '🎲', '🏆']).map(emoji => (
            <button
              key={emoji}
              onClick={() => triggerReaction(emoji)}
              className="text-xl hover:scale-135 active:scale-95 transition-all cursor-pointer select-none"
            >
              {emoji}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}
