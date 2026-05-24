import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { checkConnect4Winner, getConnect4FreeRow, getBestConnect4Move, isConnect4Draw, BoardGrid } from '../helpers/connect4Logic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Connect4BoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// -----------------------------------------------------------------
// SISTEMA DE ÁUDIO RETRÔ 8-BITS PROCEDURAL (WEB AUDIO API)
// -----------------------------------------------------------------
let c4AudioCtx: AudioContext | null = null;
let c4MusicInterval: any = null;

function stopC4ProceduralMusic() {
  if (c4MusicInterval) {
    clearInterval(c4MusicInterval);
    c4MusicInterval = null;
  }
  if (c4AudioCtx) {
    try {
      c4AudioCtx.close();
    } catch (e) {}
    c4AudioCtx = null;
  }
}

function playC4ProceduralMusic() {
  stopC4ProceduralMusic();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    c4AudioCtx = new AudioContextClass();
    
    // Uma progressão chiptune nostálgica suave C -> G -> Am -> F
    const arpeggios = [
      [261.63, 329.63, 392.00, 523.25], // C
      [196.00, 246.94, 293.66, 392.00], // G
      [220.00, 261.63, 329.63, 440.00], // Am
      [174.61, 220.00, 261.63, 349.23]  // F
    ];
    let chordIdx = 0;
    let noteIdx = 0;

    const playNote = () => {
      if (!c4AudioCtx || c4AudioCtx.state === 'suspended') return;
      const now = c4AudioCtx.currentTime;
      const chord = arpeggios[chordIdx % arpeggios.length];
      const freq = chord[noteIdx % chord.length];
      
      const osc = c4AudioCtx.createOscillator();
      const gain = c4AudioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.004, now); // muito sutil de fundo
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      
      osc.connect(gain);
      gain.connect(c4AudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.20);
      
      noteIdx++;
      if (noteIdx % 8 === 0) {
        chordIdx++;
      }
    };
    
    playNote();
    c4MusicInterval = setInterval(playNote, 240);
  } catch (e) {
    console.warn('Erro ao reproduzir chiptune:', e);
  }
}

// Efeitos sonoros Chiptune 8-Bits para Connect 4
function playC4RetroSound(type: 'drop' | 'win') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'drop') {
      // Som de queda e encaixe: deslize rápido + plop chiptune
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
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
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.22);
      });
    }
  } catch (e) {}
}

// -----------------------------------------------------------------
// SKINS E TEMAS ESTÉTICOS DE LUXO COM MODO CRT ARCADE
// -----------------------------------------------------------------
type Connect4Skin = 'cyberpunk' | 'wood' | 'holographic' | 'arcade';

const THEME_SKINS = {
  cyberpunk: {
    boardBg: 'bg-[#07090f] border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]',
    gridBg: 'bg-[#151928]/85 border-white/[0.04]',
    slotBg: 'bg-[#030712]/80 border-white/5',
    p1Piece: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.6)]',
    p2Piece: 'bg-gradient-to-br from-pink-400 to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.6)]'
  },
  wood: {
    boardBg: 'bg-[#3b2314] border-[#29170c] shadow-[0_20px_50px_rgba(0,0,0,0.8)]',
    gridBg: 'bg-[#5e381b]/95 border-[#2b170c]',
    slotBg: 'bg-[#1e0f07] border-[#2b170c] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)]',
    p1Piece: 'bg-gradient-to-br from-[#f5ebd7] to-[#d7c4a1] border-[#85512b] shadow-[0_2px_5px_rgba(0,0,0,0.5)]',
    p2Piece: 'bg-gradient-to-br from-[#8f2d24] to-[#57140f] border-[#2b0c08] shadow-[0_2px_5px_rgba(0,0,0,0.7)]'
  },
  holographic: {
    boardBg: 'bg-[#0f1124] border-indigo-500/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    gridBg: 'bg-white/5 border-white/10 backdrop-blur-sm shadow-inner',
    slotBg: 'bg-indigo-950/60 border-indigo-500/20 shadow-[inset_0_1px_4px_rgba(99,102,241,0.3)]',
    p1Piece: 'bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.6)]',
    p2Piece: 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_15px_rgba(192,132,252,0.6)]'
  },
  arcade: {
    boardBg: 'bg-[#120324] border-purple-500/30 shadow-[0_20px_50px_rgba(236,72,153,0.18)] relative overflow-hidden after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] after:bg-[length:100%_4px,3px_100%] after:pointer-events-none after:animate-pulse',
    gridBg: 'bg-[#21094e]/90 border-purple-500/20 shadow-[inset_0_1px_4px_rgba(236,72,153,0.3)]',
    slotBg: 'bg-[#120324] border-purple-500/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]',
    p1Piece: 'bg-gradient-to-br from-[#00ffff] to-[#00cccc] shadow-[0_0_15px_rgba(0,255,255,0.7)]',
    p2Piece: 'bg-gradient-to-br from-[#ff00ff] to-[#cc00cc] shadow-[0_0_15px_rgba(255,0,255,0.7)]'
  }
};

export function Connect4Board({ match, isLocal, aiDifficulty = 3, onExit }: Connect4BoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);
  const unlockAchievement = useArenaStore(state => state.unlockAchievement);

  const [localGrid, setLocalGrid] = useState<BoardGrid>(
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');
  const [winnerInfo, setWinnerInfo] = useState<{ winner: number; line: [number, number][] } | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<Connect4Skin>('cyberpunk');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Estados Premium de Física de Impacto (Connect 4)
  const [isShaking, setIsShaking] = useState(false);
  const [shockwaves, setShockwaves] = useState<{ id: string; x: number; y: number; color: string }[]>([]);

  // Efeitos visuais (Partículas e Emojis flutuantes)
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<{ id: string; color: string; x: number; y: number; dx: number; dy: number }[]>([]);

  const currentGrid = isLocal ? localGrid : (match.boardState || localGrid) as BoardGrid;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;

  const theme = THEME_SKINS[currentSkin];

  useEffect(() => {
    return () => {
      stopC4ProceduralMusic();
    };
  }, []);

  const playClickSound = () => {
    playC4RetroSound('drop');
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopC4ProceduralMusic();
      setIsMusicPlaying(false);
      toast.info('Música ambiente pausada');
    } else {
      playC4ProceduralMusic();
      setIsMusicPlaying(true);
      toast.success('Música ambiente chiptune ativada 🎵');
    }
  };

  const triggerExplosion = (x: number, y: number, color: string) => {
    // Tremer a grade
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 200);

    // Adicionar shockwave
    const swId = `${Date.now()}-${Math.random()}`;
    const swX = x * 56 + 28;
    const swY = y * 50 + 25;
    setShockwaves(prev => [...prev, { id: swId, x: swX, y: swY, color }]);
    setTimeout(() => {
      setShockwaves(prev => prev.filter(sw => sw.id !== swId));
    }, 600);

    // Efeito sutil de poeira neon na colisão de impacto
    const newParticles: any[] = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (i / count) * Math.PI; // cospe poeira neon para cima (leque superior)
      const speed = 0.8 + Math.random() * 1.5;
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        color,
        x: swX,
        y: swY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 0.5 // empurra poeira levemente para cima
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

  const checkC4Achievements = (id: string, title: string, desc: string, icon: string) => {
    if (user?.uid) {
      unlockAchievement(user.uid, id, title, desc, icon);
    }
  };

  const handleColumnClick = async (col: number) => {
    if (!isMyTurn || winnerInfo || isDraw || isAiThinking) return;

    const row = getConnect4FreeRow(currentGrid, col);
    if (row === -1) {
      toast.warning('Esta coluna já está cheia!');
      return;
    }

    const activePlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);
    const nextGrid = currentGrid.map(r => [...r]);
    nextGrid[row][col] = activePlayerNum;
    
    playClickSound();
    triggerExplosion(col, row, activePlayerNum === 1 ? '#3b82f6' : '#ec4899');

    const winResult = checkConnect4Winner(nextGrid);
    const drawResult = isConnect4Draw(nextGrid);

    if (isLocal) {
      setLocalGrid(nextGrid);
      if (winResult) {
        setWinnerInfo(winResult);
        playC4RetroSound('win');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        toast.success('Parabéns! Você venceu a máquina! 🏆');
        checkC4Achievements('c4_win', 'Conexão Superior', 'Venceu a IA em uma partida de Connect 4.', '🏆');
        return;
      }
      if (drawResult) {
        setIsDraw(true);
        toast.info('Partida empatada!');
        return;
      }
      setLocalTurn('computer');
    } else {
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextGrid, `${row},${col}`, winnerUserId);
      if (winResult) {
        playC4RetroSound('win');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        toast.success('Vitória espetacular!');
        checkC4Achievements('c4_win', 'Conexão Superior', 'Venceu na Hub Arena no Connect 4.', '🏆');
      }
      if (drawResult) {
        toast.info('Empate!');
      }
    }
  };

  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerInfo && !isDraw) {
      setIsAiThinking(true);
      
      const timer = setTimeout(() => {
        const bestCol = getBestConnect4Move(localGrid, aiDifficulty, 2);
        const row = getConnect4FreeRow(localGrid, bestCol);
        
        if (row !== -1) {
          const nextGrid = localGrid.map(r => [...r]);
          nextGrid[row][bestCol] = 2;
          
          playClickSound();
          triggerExplosion(bestCol, row, '#ec4899');
          setLocalGrid(nextGrid);

          const winResult = checkConnect4Winner(nextGrid);
          const drawResult = isConnect4Draw(nextGrid);

          if (winResult) {
            setWinnerInfo(winResult);
            toast.error('A CPU venceu desta vez!');
          } else if (drawResult) {
            setIsDraw(true);
            toast.info('Partida empatada!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        }
        setIsAiThinking(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localGrid, winnerInfo, isDraw, aiDifficulty, user?.uid]);

  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkConnect4Winner(match.boardState as BoardGrid);
      const drawResult = isConnect4Draw(match.boardState as BoardGrid);
      
      if (winResult) {
        setWinnerInfo(winResult);
      } else if (drawResult) {
        setIsDraw(true);
      }
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
    setLocalGrid(Array(6).fill(null).map(() => Array(7).fill(null)));
    setLocalTurn(user?.uid || 'player1');
    setWinnerInfo(null);
    setIsDraw(false);
    setIsAiThinking(false);
    toast.success('Partida reiniciada!');
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
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Connect 4</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        {/* 🎨 SELETOR DE SKINS */}
        <div className="space-y-1.5">
          <span className="text-[7px] font-black text-gray-500 uppercase">Tema do Tabuleiro</span>
          <div className="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
            {(['cyberpunk', 'wood', 'holographic'] as Connect4Skin[]).map(skin => (
              <button
                key={skin}
                onClick={() => setCurrentSkin(skin)}
                className={`py-1.5 text-[7px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  currentSkin === skin
                  ? 'bg-blue-600 text-white shadow-md'
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
              ? 'bg-gradient-to-br from-blue-500 to-rose-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
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
            ? 'bg-blue-500/10 border-blue-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-blue-400 uppercase">Jogador 1 (Azul)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-blue-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-pink-500/10 border-pink-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-pink-400 uppercase">Jogador 2 (Rosa)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-pink-400 uppercase mt-1 animate-pulse">Pensando...</span>
            )}
          </div>
        </div>

        {(winnerInfo || isDraw) && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {isDraw ? 'EMPATE!' : winnerInfo?.winner === 1 ? 'JOGADOR 1 VENCEU!' : 'JOGADOR 2 VENCEU!'}
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

      {/* 🔴 TABULEIRO FÍSICO COM GRADE GLASSMOPHISM (DIREITA) */}
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
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`
              }}
            />
          ))}
        </div>

        {/* Indicador de Setas no Topo */}
        <div className="grid grid-cols-7 gap-4 w-[420px] mb-2 px-4 justify-items-center">
          {Array(7).fill(null).map((_, col) => {
            const isColFull = currentGrid[0][col] !== null;
            return (
              <button
                key={col}
                onClick={() => handleColumnClick(col)}
                disabled={!isMyTurn || !!winnerInfo || isDraw || isColFull}
                className={`w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all ${
                  isMyTurn && !winnerInfo && !isDraw && !isColFull
                  ? 'bg-white/5 hover:bg-primary-500/20 hover:border-primary-500/30 text-gray-500 hover:text-white cursor-pointer hover:-translate-y-1' 
                  : 'bg-transparent text-transparent pointer-events-none'
                }`}
              >
                ↓
              </button>
            );
          })}
        </div>

        {/* Grade do Connect 4 */}
        <motion.div 
          animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.2 }}
          className={`relative p-6 border rounded-[3rem] ${theme.boardBg}`}
        >
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-blue-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          <div className="relative">
            <div className={`relative z-10 grid grid-rows-6 gap-4 w-[390px] h-[340px] p-2.5 rounded-2xl ${theme.gridBg}`}>
              {currentGrid.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-4">
                  {row.map((cell, cIdx) => {
                    const isWinningCell = winnerInfo?.line.some(([winR, winC]) => winR === rIdx && winC === cIdx);
                    
                    return (
                      <div 
                        key={cIdx}
                        onClick={() => handleColumnClick(cIdx)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden cursor-pointer transition-all ${theme.slotBg} ${
                          isWinningCell ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-105' : ''
                        }`}
                      >
                        <div className="absolute inset-1 rounded-full border border-white/5 shadow-inner" />
                        
                        {cell !== null && (
                          <motion.div 
                            initial={{ y: -300, scale: 0.2 }}
                            animate={{ y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                            className={`absolute inset-0.5 rounded-full flex items-center justify-center relative ${
                              cell === 1 ? theme.p1Piece : theme.p2Piece
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center opacity-70">
                              <div className="w-2 h-2 rounded-full bg-white/20" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Painel SVG de Shockwaves alinhado com a grade */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              {shockwaves.map(sw => (
                <motion.circle
                  key={sw.id}
                  cx={sw.x}
                  cy={sw.y}
                  initial={{ r: 4, opacity: 0.8, strokeWidth: 4 }}
                  animate={{ r: 45, opacity: 0, strokeWidth: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  fill="none"
                  stroke={sw.color}
                />
              ))}
            </svg>
          </div>
        </motion.div>

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
