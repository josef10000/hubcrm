import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { CheckersGrid, CheckersMove, getCheckersValidMoves, applyCheckersMove, checkCheckersWinner, getBestCheckersMove } from '../helpers/checkersLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface CheckersBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// -----------------------------------------------------------------
// SISTEMA DE ÁUDIO PROCEDURAL INTEGRADO (WEB AUDIO API)
// -----------------------------------------------------------------
let checkersAudioCtx: AudioContext | null = null;
let checkersMusicInterval: any = null;

function stopCheckersProceduralMusic() {
  if (checkersMusicInterval) {
    clearInterval(checkersMusicInterval);
    checkersMusicInterval = null;
  }
  if (checkersAudioCtx) {
    try {
      checkersAudioCtx.close();
    } catch (e) {}
    checkersAudioCtx = null;
  }
}

function playCheckersProceduralMusic() {
  stopCheckersProceduralMusic();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    checkersAudioCtx = new AudioContextClass();
    
    // Acordes cíclicos espaciais e aveludados Lofi
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
      [349.23, 440.00, 523.25, 659.25, 783.99], // Fmaj9
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
      [196.00, 246.94, 293.66, 392.00, 440.00]  // G6
    ];
    let step = 0;

    const playNextChord = () => {
      if (!checkersAudioCtx || checkersAudioCtx.state === 'suspended') return;
      const now = checkersAudioCtx.currentTime;
      const notes = chords[step % chords.length];
      
      notes.forEach((freq, idx) => {
        const osc = checkersAudioCtx!.createOscillator();
        const gain = checkersAudioCtx!.createGain();
        const filter = checkersAudioCtx!.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq + Math.sin(idx) * 2, now + 5.5);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650 + idx * 80, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.012, now + 1.8);
        gain.gain.setValueAtTime(0.012, now + 4.0);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(checkersAudioCtx!.destination);
        
        osc.start(now);
        osc.stop(now + 6.0);
      });
      step++;
    };

    playNextChord();
    checkersMusicInterval = setInterval(playNextChord, 6000);
  } catch (e) {
    console.warn('Áudio procedural suspenso:', e);
  }
}

// -----------------------------------------------------------------
// SKINS E TEMAS ESTÉTICOS DE LUXO
// -----------------------------------------------------------------
type CheckersSkin = 'cyberpunk' | 'wood' | 'holographic';

const THEME_SKINS = {
  cyberpunk: {
    boardBg: 'bg-[#07090f] border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]',
    darkSquare: 'bg-[#0f121d] hover:bg-[#151928]',
    lightSquare: 'bg-[#1e2330]',
    p1Piece: 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
    p2Piece: 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-500/20 shadow-[0_0_15px_rgba(217,119,6,0.5)]'
  },
  wood: {
    boardBg: 'bg-[#3b2314] border-[#29170c] shadow-[0_20px_50px_rgba(0,0,0,0.8)]',
    darkSquare: 'bg-[#5e381b]',
    lightSquare: 'bg-[#d7a15c]',
    p1Piece: 'bg-gradient-to-br from-[#8f2d24] to-[#57140f] border-[#2b0c08] shadow-[0_2px_5px_rgba(0,0,0,0.7)]',
    p2Piece: 'bg-gradient-to-br from-[#241205] to-[#070301] border-[#100701] shadow-[0_2px_5px_rgba(0,0,0,0.9)]'
  },
  holographic: {
    boardBg: 'bg-[#0f1124] border-indigo-500/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    darkSquare: 'bg-indigo-950/45 border-white/[0.02]',
    lightSquare: 'bg-white/5 border-white/[0.02]',
    p1Piece: 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_15px_rgba(192,132,252,0.6)]',
    p2Piece: 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.6)]'
  }
};

export function CheckersBoard({ match, isLocal, aiDifficulty = 3, onExit }: CheckersBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);
  const unlockAchievement = useArenaStore(state => state.unlockAchievement);

  const [localGrid, setLocalGrid] = useState<CheckersGrid>(() => {
    const grid = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 2, type: 'normal' };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 1, type: 'normal' };
      }
    }
    return grid;
  });
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');

  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<CheckersSkin>('cyberpunk');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Efeitos visuais
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<{ id: string; color: string; x: number; y: number; dx: number; dy: number }[]>([]);

  const currentGrid = isLocal ? localGrid : (match.boardState || localGrid) as CheckersGrid;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;
  const myPlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);

  const activePlayerNum = isLocal ? (localTurn === 'computer' ? 2 : 1) : (match.turn === match.player1Id ? 1 : 2);
  const validMoves = getCheckersValidMoves(currentGrid, activePlayerNum);
  const selectedMoves = selectedPiece ? validMoves.filter(m => m.from[0] === selectedPiece[0] && m.from[1] === selectedPiece[1]) : [];

  const theme = THEME_SKINS[currentSkin];

  useEffect(() => {
    return () => {
      stopCheckersProceduralMusic();
    };
  }, []);

  const playMoveSound = (isCapture: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCapture ? 280 : 180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(isCapture ? 420 : 250, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopCheckersProceduralMusic();
      setIsMusicPlaying(false);
      toast.info('Música ambiente pausada');
    } else {
      playCheckersProceduralMusic();
      setIsMusicPlaying(true);
      toast.success('Música ambiente procedural ativada 🎵');
    }
  };

  const triggerExplosion = (x: number, y: number, color: string) => {
    const newParticles: any[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const speed = 1.2 + Math.random() * 2;
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        color,
        x: x * 48 + 24, // grade 8x8 de 384px, aproximadamente 48px por quadrado
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

  const checkCheckersAchievements = (id: string, title: string, desc: string, icon: string) => {
    if (user?.uid) {
      unlockAchievement(user.uid, id, title, desc, icon);
    }
  };

  const handlePieceClick = (r: number, c: number) => {
    if (!isMyTurn || winnerPlayer || isAiThinking) return;

    const piece = currentGrid[r][c];
    if (piece && piece.player === myPlayerNum) {
      const hasCaptures = validMoves.some(m => m.captures);
      const pieceMoves = validMoves.filter(m => m.from[0] === r && m.from[1] === c);
      
      if (hasCaptures && pieceMoves.length === 0) {
        toast.warning('Você é obrigado a capturar peças adversárias nesta rodada!');
        return;
      }
      
      setSelectedPiece([r, c]);
    }
  };

  const handleCellClick = async (r: number, c: number) => {
    if (!selectedPiece) return;

    const targetMove = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (!targetMove) {
      const piece = currentGrid[r][c];
      if (piece && piece.player === myPlayerNum) {
        handlePieceClick(r, c);
      } else {
        setSelectedPiece(null);
      }
      return;
    }

    const nextGrid = applyCheckersMove(currentGrid, targetMove);
    playMoveSound(!!targetMove.captures);
    triggerExplosion(c, r, targetMove.captures ? '#ef4444' : '#10b981');
    setSelectedPiece(null);

    const winResult = checkCheckersWinner(nextGrid);

    // Conquista ao virar Dama
    const isPromoted = nextGrid[r][c]?.type === 'king' && currentGrid[selectedPiece[0]][selectedPiece[1]]?.type === 'normal';
    if (isPromoted) {
      checkCheckersAchievements('chk_king', 'Voo Majestoso', 'Promoveu uma peça a Dama Brasileira de longo alcance.', '👑');
    }

    if (isLocal) {
      setLocalGrid(nextGrid);
      if (winResult) {
        setWinnerPlayer(winResult);
        toast.success('Parabéns! Você venceu o computador! 🏆');
        checkCheckersAchievements('chk_win', 'Mestre das Damas', 'Venceu uma partida de Damas na Hub Arena.', '🏆');
        return;
      }
      setLocalTurn('computer');
    } else {
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextGrid, `${targetMove.from.join(',')}-${targetMove.to.join(',')}`, winnerUserId);
      if (winResult) {
        toast.success('Vitória espetacular na Dama!');
        checkCheckersAchievements('chk_win', 'Mestre das Damas', 'Venceu uma partida de Damas na Hub Arena.', '🏆');
      }
    }
  };

  // Efeito da IA no Damas
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerPlayer) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        const bestMove = getBestCheckersMove(localGrid, aiDifficulty, 2);
        
        if (bestMove) {
          const nextGrid = applyCheckersMove(localGrid, bestMove);
          playMoveSound(!!bestMove.captures);
          
          triggerExplosion(bestMove.to[1], bestMove.to[0], bestMove.captures ? '#ef4444' : '#6366f1');
          setLocalGrid(nextGrid);

          const winResult = checkCheckersWinner(nextGrid);
          if (winResult) {
            setWinnerPlayer(winResult);
            toast.error('O computador venceu a partida!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        } else {
          setWinnerPlayer(1);
          toast.success('Você venceu! O computador ficou bloqueado.');
          checkCheckersAchievements('chk_win', 'Mestre das Damas', 'Venceu a IA bloqueando seus movimentos.', '🏆');
        }
        setIsAiThinking(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localGrid, winnerPlayer, aiDifficulty, user?.uid]);

  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkCheckersWinner(match.boardState as CheckersGrid);
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
    const grid = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 2, type: 'normal' };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 1, type: 'normal' };
      }
    }
    setLocalGrid(grid);
    setLocalTurn(user?.uid || 'player1');
    setSelectedPiece(null);
    setWinnerPlayer(null);
    setIsAiThinking(false);
    toast.success('Partida de Damas reiniciada!');
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
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Damas Clássicas</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        {/* 🎨 SELETOR DE SKINS */}
        <div className="space-y-1.5">
          <span className="text-[7px] font-black text-gray-500 uppercase">Tema do Tabuleiro</span>
          <div className="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
            {(['cyberpunk', 'wood', 'holographic'] as CheckersSkin[]).map(skin => (
              <button
                key={skin}
                onClick={() => setCurrentSkin(skin)}
                className={`py-1.5 text-[7px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  currentSkin === skin
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {skin === 'cyberpunk' ? 'Tron' : skin === 'wood' ? 'Madeira' : 'Holog'}
              </button>
            ))}
          </div>
        </div>

        {/* 🎵 BOTÃO DE CONTROLE DE MÚSICA */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-gray-500 uppercase">Som da Arena</span>
            <span className="text-[8px] font-bold text-white">Música Lofi</span>
          </div>

          <button
            onClick={toggleMusic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMusicPlaying
              ? 'bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
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
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-rose-500/10 border-rose-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-rose-400 uppercase">Peças Vermelhas (Você)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-rose-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-amber-500 uppercase">Peças Metálicas</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-amber-400 uppercase mt-1 animate-pulse">Pensando...</span>
            )}
          </div>
        </div>

        {winnerPlayer && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {winnerPlayer === 1 ? 'VERMELHAS VENCERAM!' : 'METÁLICAS VENCERAM!'}
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

      {/* 🏆 TABULEIRO DE DAMAS CLÁSSICO 8X8 (DIREITA) */}
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
          <div className="absolute inset-0 bg-amber-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Damas */}
          <div className={`relative z-10 grid grid-rows-8 gap-0.5 w-[384px] h-[384px] p-1.5 overflow-hidden border rounded-2xl ${theme.boardBg}`}>
            {currentGrid.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-8 gap-0.5">
                {row.map((piece, cIdx) => {
                  const isBlackSquare = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedPiece?.[0] === rIdx && selectedPiece?.[1] === cIdx;
                  
                  const isValidTarget = selectedMoves.find(m => m.to[0] === rIdx && m.to[1] === cIdx);

                  return (
                    <div
                      key={cIdx}
                      onClick={() => isBlackSquare && (piece ? handlePieceClick(rIdx, cIdx) : handleCellClick(rIdx, cIdx))}
                      className={`w-11 h-11 flex items-center justify-center relative select-none cursor-pointer transition-all ${
                        isBlackSquare 
                        ? theme.darkSquare 
                        : theme.lightSquare
                      }`}
                    >
                      {/* Destaque de destino de movimento válido */}
                      {isValidTarget && (
                        <div className="absolute inset-1 border-2 border-emerald-500/60 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.35)] z-20" />
                      )}

                      {/* Renderização física da Peça de Dama */}
                      {piece && (
                        <motion.div
                          layoutId={`piece-${rIdx}-${cIdx}`}
                          className={`w-9 h-9 rounded-full flex items-center justify-center relative shadow-lg active:scale-95 transition-all ${
                            piece.player === 1 ? theme.p1Piece : theme.p2Piece
                          } ${
                            isSelected ? 'ring-2 ring-white scale-105 z-30' : ''
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center opacity-60">
                            <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                              {piece.type === 'king' ? (
                                <span className="text-white text-xs">👑</span>
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                              )}
                            </div>
                          </div>
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
