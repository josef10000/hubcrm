import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { LudoBoardState, LudoToken, LudoColor, createInitialLudoState, getLudoValidMoves, applyLudoMove, getBestLudoMove, getLudoCoords, canLudoTokenMove } from '../helpers/ludoLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { HelpCircle, Star } from 'lucide-react';
import { GameHelpModal } from './GameHelpModal';

interface LudoBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// -----------------------------------------------------------------
// SISTEMA DE ÁUDIO RETRÔ 8-BITS PROCEDURAL (WEB AUDIO API)
// -----------------------------------------------------------------
let ludoAudioCtx: AudioContext | null = null;
let ludoMusicInterval: any = null;

function stopLudoProceduralMusic() {
  if (ludoMusicInterval) {
    clearInterval(ludoMusicInterval);
    ludoMusicInterval = null;
  }
  if (ludoAudioCtx) {
    try {
      ludoAudioCtx.close();
    } catch (e) {}
    ludoAudioCtx = null;
  }
}

function playLudoProceduralMusic() {
  stopLudoProceduralMusic();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    ludoAudioCtx = new AudioContextClass();
    
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
      if (!ludoAudioCtx || ludoAudioCtx.state === 'suspended') return;
      const now = ludoAudioCtx.currentTime;
      const chord = arpeggios[chordIdx % arpeggios.length];
      const freq = chord[noteIdx % chord.length];
      
      const osc = ludoAudioCtx.createOscillator();
      const gain = ludoAudioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.004, now); // muito sutil de fundo
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      
      osc.connect(gain);
      gain.connect(ludoAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.20);
      
      noteIdx++;
      if (noteIdx % 8 === 0) {
        chordIdx++;
      }
    };
    
    playNote();
    ludoMusicInterval = setInterval(playNote, 240);
  } catch (e) {
    console.warn('Erro ao reproduzir chiptune:', e);
  }
}

// Efeitos sonoros Chiptune 8-Bits para Ludo
function playLudoRetroSound(type: 'dice' | 'move' | 'capture' | 'win') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'dice') {
      const times = [0, 0.05, 0.1, 0.15, 0.2, 0.25];
      times.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freq = 280 + Math.random() * 350;
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0.04, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.04);
      });
    } else if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.18);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
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
// SKINS E TEMAS ESTÉTICOS DE LUXO COM FILTRO RETRÔ ARCADE CRT
// -----------------------------------------------------------------
type LudoSkin = 'cyberpunk' | 'wood' | 'holographic' | 'arcade';

const THEME_SKINS = {
  cyberpunk: {
    boardBg: 'bg-[#07090f] border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]',
    trackBg: 'bg-[#151928]/60 border-white/[0.04] shadow-inner',
    redBase: 'bg-rose-500/10 border-rose-500/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]',
    greenBase: 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]',
    yellowBase: 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]',
    blueBase: 'bg-indigo-500/10 border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]',
    centerBg: 'bg-indigo-950/40 border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    socketBg: 'border-2 border-white/5 bg-slate-950/80 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)]',
    cellBorder: 'border-white/[0.02]'
  },
  wood: {
    boardBg: 'bg-[#3b2314] border-[#29170c] shadow-[0_20px_50px_rgba(0,0,0,0.8)]',
    trackBg: 'bg-[#d7a15c]/95 border-[#85512b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-md',
    redBase: 'bg-[#8f2d24]/90 border-[#57140f] shadow-inner rounded-xl',
    greenBase: 'bg-[#2b593f]/90 border-[#12301e] shadow-inner rounded-xl',
    yellowBase: 'bg-[#d49b2c]/90 border-[#7a5410] shadow-inner rounded-xl',
    blueBase: 'bg-[#294c7a]/90 border-[#0e223d] shadow-inner rounded-xl',
    centerBg: 'bg-[#5e381b] border-[#2b170c] shadow-inner rounded-xl',
    socketBg: 'border-[#2b170c] bg-[#1e0f07] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9)]',
    cellBorder: 'border-[#85512b]/55'
  },
  holographic: {
    boardBg: 'bg-[#0f1124] border-indigo-500/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    trackBg: 'bg-white/5 border-white/10 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)] backdrop-blur-sm rounded-md',
    redBase: 'bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 backdrop-blur-md rounded-xl',
    greenBase: 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 backdrop-blur-md rounded-xl',
    yellowBase: 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 backdrop-blur-md rounded-xl',
    blueBase: 'bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20 backdrop-blur-md rounded-xl',
    centerBg: 'bg-gradient-to-tr from-rose-500/10 via-indigo-500/10 to-emerald-500/10 border-white/10 backdrop-blur-xl rounded-xl',
    socketBg: 'border border-indigo-500/25 bg-indigo-950/50 shadow-[inset_0_1px_4px_rgba(99,102,241,0.35)]',
    cellBorder: 'border-white/5'
  },
  arcade: {
    boardBg: 'bg-[#120324] border-purple-500/30 shadow-[0_20px_50px_rgba(236,72,153,0.18)] relative overflow-hidden after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] after:bg-[length:100%_4px,3px_100%] after:pointer-events-none after:animate-pulse',
    trackBg: 'bg-[#21094e]/90 border-purple-500/20 shadow-[inset_0_1px_4px_rgba(236,72,153,0.3)] rounded-sm',
    redBase: 'bg-rose-950/45 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)] rounded-lg',
    greenBase: 'bg-emerald-950/45 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-lg',
    yellowBase: 'bg-amber-950/45 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] rounded-lg',
    blueBase: 'bg-indigo-950/45 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)] rounded-lg',
    centerBg: 'bg-purple-950/50 border-purple-500/30 rounded-lg',
    socketBg: 'border-2 border-purple-500/20 bg-purple-950/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]',
    cellBorder: 'border-purple-500/10'
  }
};

export function LudoBoard({ match, isLocal, aiDifficulty = 3, onExit }: LudoBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);
  const unlockAchievement = useArenaStore(state => state.unlockAchievement);

  // Estados dos Jogos e Visuais
  const [localBoard, setLocalBoard] = useState<LudoBoardState>(createInitialLudoState());
  const [localTurn, setLocalTurn] = useState<LudoColor>('red');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<LudoSkin>('cyberpunk');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Efeitos Especiais: Emojis flutuantes e Partículas
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<{ id: string; color: string; x: number; y: number; dx: number; dy: number }[]>([]);

  const currentBoard = isLocal ? localBoard : (match.boardState || localBoard) as LudoBoardState;
  const myColor: LudoColor = isLocal 
    ? 'red' 
    : (match.player1Id === user?.uid ? 'red' 
       : match.player2Id === user?.uid ? 'green' 
       : match.player3Id === user?.uid ? 'yellow' 
       : match.player4Id === user?.uid ? 'blue' 
       : 'red');
  const activeColor: LudoColor = isLocal ? localTurn : (match.turn as LudoColor || 'red');
  const isMyTurn = isLocal ? localTurn === 'red' : (match.turn === myColor);

  const getPlayerNameByColor = (color: LudoColor): string => {
    if (isLocal) {
      if (color === 'red') return 'Você';
      if (color === 'green') return 'Verde (CPU)';
      if (color === 'yellow') return 'Amarelo (CPU)';
      return 'Azul (CPU)';
    }
    if (color === 'red') return match.player1Name || 'Vermelho';
    if (color === 'green') return match.player2Name || 'Verde';
    if (color === 'yellow') return match.player3Name || 'Amarelo';
    return match.player4Name || 'Azul';
  };

  const getPlayerLabel = (color: LudoColor): string => {
    const name = getPlayerNameByColor(color);
    if (!isLocal) {
      const isMe = 
        (color === 'red' && match.player1Id === user?.uid) ||
        (color === 'green' && match.player2Id === user?.uid) ||
        (color === 'yellow' && match.player3Id === user?.uid) ||
        (color === 'blue' && match.player4Id === user?.uid);
      if (isMe) return `${name} (Você)`;
    }
    return name;
  };

  const isCpuActiveColor = (color: LudoColor): boolean => {
    if (isLocal) return color !== 'red';
    if (color === 'red') return match.player1Id === 'computer';
    if (color === 'green') return match.player2Id === 'computer';
    if (color === 'yellow') return match.player3Id === 'computer';
    return match.player4Id === 'computer';
  };

  const theme = THEME_SKINS[currentSkin];

  // Desativa música ao desmontar
  useEffect(() => {
    return () => {
      stopLudoProceduralMusic();
    };
  }, []);

  // Efeitos Sonoros Chiptune Locais
  const playDiceSound = () => {
    playLudoRetroSound('dice');
  };

  const playMoveSound = (isCapture: boolean) => {
    playLudoRetroSound(isCapture ? 'capture' : 'move');
  };

  // Trilha sonora controle
  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopLudoProceduralMusic();
      setIsMusicPlaying(false);
      toast.info('Música ambiente pausada');
    } else {
      playLudoProceduralMusic();
      setIsMusicPlaying(true);
      toast.success('Música ambiente chiptune ativada 🎵');
    }
  };

  // Efeito de Partículas Neon (Disparo)
  const triggerExplosion = (x: number, y: number, particleColor: string) => {
    const newParticles: any[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const speed = 1.5 + Math.random() * 2.5;
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        color: particleColor,
        x: x * 25.6 + 12.8, // converte coordenadas de grade para pixel aproximado no tabuleiro
        y: y * 25.6 + 12.8,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    // Limpa partículas após 800ms
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };

  // Chat de Reações Rápidas (Emojis Flutuantes)
  const triggerReaction = (emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 50 + Math.random() * 100; // posição x inicial na área do tabuleiro
    const newReaction = { id, emoji, x, y: 350 };
    setFloatingEmojis(prev => [...prev, newReaction]);

    // Limpa reação
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(re => re.id !== id));
    }, 2000);
  };

  // Lógica de Conquistas
  const checkLudoAchievements = (id: string, title: string, desc: string, icon: string) => {
    if (user?.uid) {
      unlockAchievement(user.uid, id, title, desc, icon);
    }
  };

  const getNextLudoColorTurn = (current: LudoColor): LudoColor => {
    const sequence: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const idx = sequence.indexOf(current);
    return sequence[(idx + 1) % 4];
  };

  const handleRollDice = async () => {
    if (!isMyTurn || currentBoard.hasRolled || diceRolling || currentBoard.winnerColor) return;

    setDiceRolling(true);
    playDiceSound();

    setTimeout(async () => {
      const rolledValue = Math.floor(Math.random() * 6) + 1;
      setDiceRolling(false);

      const nextBoard = {
        ...currentBoard,
        diceValue: rolledValue,
        hasRolled: true
      };

      const potentialMoves = getLudoValidMoves(nextBoard, activeColor);
      const colorLabel = activeColor === 'red' ? 'Vermelho' : activeColor === 'green' ? 'Verde' : activeColor === 'yellow' ? 'Amarelo' : 'Azul';

      if (potentialMoves.length === 0) {
        toast.info(`Rolou ${rolledValue}! Sem movimentos para ${colorLabel}.`);
        nextBoard.diceValue = null;
        nextBoard.hasRolled = false;

        const nextColorTurn = getNextLudoColorTurn(activeColor);

        if (isLocal) {
          setLocalBoard(nextBoard);
          setLocalTurn(nextColorTurn);
        } else {
          await makeMove(nextBoard, `roll-${rolledValue}-no-moves`, undefined, nextColorTurn);
        }
      } else {
        if (isLocal) {
          setLocalBoard(nextBoard);
        } else {
          await makeMove(nextBoard, `roll-${rolledValue}`, undefined, activeColor);
        }
      }
    }, 550);
  };

  const handleSelectToken = async (token: LudoToken) => {
    if (!isMyTurn || !currentBoard.hasRolled || currentBoard.diceValue === null || diceRolling) return;
    if (token.color !== activeColor) return;

    const oldBoard = currentBoard;
    const nextBoard = applyLudoMove(currentBoard, token, currentBoard.diceValue);
    
    const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > oldBoard.tokens.filter(t => t.position === -1).length;
    const hasReachedGoal = token.position !== 105 && nextBoard.tokens.find(t => t.id === token.id)?.position === 105;

    // Dispara explosão visual apenas em capturas ou chegada triunfante
    if (isCapture || hasReachedGoal) {
      const coords = getLudoCoords(token.color, token);
      triggerExplosion(coords.x, coords.y, token.color === 'red' ? '#ef4444' : token.color === 'green' ? '#10b981' : token.color === 'yellow' ? '#f59e0b' : '#6366f1');
    }

    playMoveSound(isCapture);

    if (isCapture) {
      toast.success('💥 Captura! Ficha oponente retornou para o ninho.');
      // Conquista de Captura
      checkLudoAchievements('ludo_cap', 'Predador da Arena', 'Mandou uma ficha oponente de volta para a base no Ludo.', '💥');
    }

    if (nextBoard.winnerColor) {
      setLocalBoard(nextBoard);
      playLudoRetroSound('win');
      if (nextBoard.winnerColor === 'red') {
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
      }
      toast.success(`👑 Vitória Consagrada! O jogador ${nextBoard.winnerColor.toUpperCase()} venceu o Ludo!`);
      // Conquista de Vitória
      checkLudoAchievements('ludo_win', 'Campeão Real do Ludo', 'Venceu uma partida completa de Ludo 4P.', '👑');
      return;
    }

    const rollAgain = currentBoard.diceValue === 6;
    
    nextBoard.diceValue = null;
    nextBoard.hasRolled = false;

    if (isLocal) {
      setLocalBoard(nextBoard);
      if (!rollAgain) {
        setLocalTurn(getNextLudoColorTurn(activeColor));
      } else {
        toast.success('Rode o dado novamente! Bônus de jogada extra.');
      }
    } else {
      const nextColorTurn = rollAgain ? activeColor : getNextLudoColorTurn(activeColor);
      
      let winnerId: string | undefined = undefined;
      if (nextBoard.winnerColor) {
        if (nextBoard.winnerColor === 'red') winnerId = match.player1Id;
        else if (nextBoard.winnerColor === 'green') winnerId = match.player2Id;
        else if (nextBoard.winnerColor === 'yellow') winnerId = match.player3Id;
        else if (nextBoard.winnerColor === 'blue') winnerId = match.player4Id;
      }

      await makeMove(nextBoard, `move-${token.color}-${token.id}`, winnerId, nextColorTurn);
      
      if (rollAgain) {
        toast.success('Rode o dado novamente! Bônus de jogada extra.');
      }
    }
  };

  // Efeito IA para as 3 CPUs offline
  useEffect(() => {
    if (isLocal && localTurn !== 'red' && !currentBoard.winnerColor) {
      setIsAiThinking(true);

      const aiTimer = setTimeout(() => {
        playDiceSound();
        const aiDice = Math.floor(Math.random() * 6) + 1;
        
        const boardWithDice = {
          ...localBoard,
          diceValue: aiDice,
          hasRolled: true
        };

        const validAiMoves = getLudoValidMoves(boardWithDice, localTurn);

        if (validAiMoves.length === 0) {
          boardWithDice.diceValue = null;
          boardWithDice.hasRolled = false;
          setLocalBoard(boardWithDice);
          setLocalTurn(getNextLudoColorTurn(localTurn));
          setIsAiThinking(false);
          return;
        }

        setTimeout(() => {
          const bestToken = getBestLudoMove(boardWithDice, aiDice, localTurn);
          if (bestToken) {
            const nextBoard = applyLudoMove(boardWithDice, bestToken, aiDice);
            
            const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > boardWithDice.tokens.filter(t => t.position === -1).length;
            const hasReachedGoal = bestToken.position !== 105 && nextBoard.tokens.find(t => t.id === bestToken.id)?.position === 105;

            if (isCapture || hasReachedGoal) {
              const coords = getLudoCoords(bestToken.color, bestToken);
              triggerExplosion(coords.x, coords.y, bestToken.color === 'green' ? '#10b981' : bestToken.color === 'yellow' ? '#f59e0b' : '#6366f1');
            }

            playMoveSound(isCapture);

            nextBoard.diceValue = null;
            nextBoard.hasRolled = false;
            setLocalBoard(nextBoard);

            if (nextBoard.winnerColor) {
              playLudoRetroSound('win');
              toast.error(`A CPU ${nextBoard.winnerColor.toUpperCase()} venceu a partida de Ludo!`);
            } else {
              const rollAgain = aiDice === 6;
              if (rollAgain) {
                setLocalTurn(localTurn);
              } else {
                setLocalTurn(getNextLudoColorTurn(localTurn));
              }
            }
          }
          setIsAiThinking(false);
        }, 700);

      }, 900);

      return () => clearTimeout(aiTimer);
    }
  }, [isLocal, localTurn, localBoard, currentBoard.winnerColor]);

  // Efeito de IA para as CPUs no modo ONLINE (executado apenas na máquina do Host / player1)
  useEffect(() => {
    const isHost = !isLocal && match.player1Id === user?.uid;
    if (isHost && !currentBoard.winnerColor && !isAiThinking) {
      // Verifica se a cor ativa atual é controlada por CPU
      const isCpuActive = 
        (activeColor === 'green' && match.player2Id === 'computer') ||
        (activeColor === 'yellow' && match.player3Id === 'computer') ||
        (activeColor === 'blue' && match.player4Id === 'computer');

      if (isCpuActive && !diceRolling && !currentBoard.hasRolled) {
        setIsAiThinking(true);
        
        const aiTimer = setTimeout(() => {
          playDiceSound();
          const aiDice = Math.floor(Math.random() * 6) + 1;
          
          const boardWithDice = {
            ...currentBoard,
            diceValue: aiDice,
            hasRolled: true
          };

          const validAiMoves = getLudoValidMoves(boardWithDice, activeColor);

          if (validAiMoves.length === 0) {
            boardWithDice.diceValue = null;
            boardWithDice.hasRolled = false;
            
            const nextColorTurn = getNextLudoColorTurn(activeColor);
            makeMove(boardWithDice, `cpu-roll-${aiDice}-no-moves`, undefined, nextColorTurn);
            setIsAiThinking(false);
            return;
          }

          setTimeout(() => {
            const bestToken = getBestLudoMove(boardWithDice, aiDice, activeColor);
            if (bestToken) {
              const nextBoard = applyLudoMove(boardWithDice, bestToken, aiDice);
              
              const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > boardWithDice.tokens.filter(t => t.position === -1).length;
              const hasReachedGoal = bestToken.position !== 105 && nextBoard.tokens.find(t => t.id === bestToken.id)?.position === 105;

              if (isCapture || hasReachedGoal) {
                const coords = getLudoCoords(bestToken.color, bestToken);
                triggerExplosion(coords.x, coords.y, bestToken.color === 'green' ? '#10b981' : bestToken.color === 'yellow' ? '#f59e0b' : '#6366f1');
              }

              playMoveSound(isCapture);

              nextBoard.diceValue = null;
              nextBoard.hasRolled = false;

              const rollAgain = aiDice === 6;
              const nextColorTurn = rollAgain ? activeColor : getNextLudoColorTurn(activeColor);
              
              let winnerId: string | undefined = undefined;
              if (nextBoard.winnerColor) {
                if (nextBoard.winnerColor === 'red') winnerId = match.player1Id;
                else if (nextBoard.winnerColor === 'green') winnerId = match.player2Id;
                else if (nextBoard.winnerColor === 'yellow') winnerId = match.player3Id;
                else if (nextBoard.winnerColor === 'blue') winnerId = match.player4Id;
              }

              makeMove(nextBoard, `cpu-move-${bestToken.color}-${bestToken.id}`, winnerId, nextColorTurn);
            }
            setIsAiThinking(false);
          }, 700);

        }, 900);

        return () => clearTimeout(aiTimer);
      }
    }
  }, [isLocal, activeColor, currentBoard, match, user?.uid, diceRolling, isAiThinking]);

  const handleRestartLocalGame = () => {
    setLocalBoard(createInitialLudoState());
    setLocalTurn('red');
    setIsAiThinking(false);
    setDiceRolling(false);
    toast.success('Partida de Ludo 4 Jogadores reiniciada!');
  };

  const handleLeaveGame = () => {
    if (isLocal) {
      if (onExit) onExit();
    } else {
      exitActiveMatch();
    }
  };

  const LUDO_COLORS_THEME: Record<LudoColor, { text: string; shadow: string; label: string; border: string }> = {
    red: { text: 'text-rose-400', shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]', label: 'Vermelho (Você)', border: 'border-rose-500/30' },
    green: { text: 'text-emerald-400', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', label: 'Verde (CPU)', border: 'border-emerald-500/30' },
    yellow: { text: 'text-amber-400', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]', label: 'Amarelo (CPU)', border: 'border-amber-500/30' },
    blue: { text: 'text-indigo-400', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]', label: 'Azul (CPU)', border: 'border-indigo-500/30' }
  };

  // Coordenadas de nichos/soquetes de garagem reais base
  const isLudoSocketCell = (x: number, y: number): LudoColor | null => {
    if (x >= 2 && x <= 3 && y >= 2 && y <= 3) return 'red';
    if (x >= 11 && x <= 12 && y >= 2 && y <= 3) return 'green';
    if (x >= 2 && x <= 3 && y >= 11 && y <= 12) return 'yellow';
    if (x >= 11 && x <= 12 && y >= 11 && y <= 12) return 'blue';
    return null;
  };

  const renderLudoCellDesign = (x: number, y: number) => {
    const isRedBase = x < 6 && y < 6;
    const isGreenBase = x >= 9 && y < 6;
    const isYellowBase = x < 6 && y >= 9;
    const isBlueBase = x >= 9 && y >= 9;

    const isRedHome = y === 7 && x > 0 && x < 6;
    const isGreenHome = x === 7 && y > 0 && y < 6;
    const isYellowHome = x === 7 && y > 8 && y < 14;
    const isBlueHome = y === 7 && x > 8 && x < 14;

    const isRedStart = x === 1 && y === 6;
    const isGreenStart = x === 8 && y === 1;
    const isYellowStart = x === 6 && y === 13;
    const isBlueStart = x === 13 && y === 8;

    const isCenter = x >= 6 && x <= 8 && y >= 6 && y <= 8;

    // Se for Base de Canto, aplica molduras elegantes com cantos arredondados luxo
    if (isRedBase) {
      let rounded = '';
      if (x === 0 && y === 0) rounded = 'rounded-tl-2xl';
      return `${theme.redBase} ${rounded} ${theme.cellBorder}`;
    }
    if (isGreenBase) {
      let rounded = '';
      if (x === 14 && y === 0) rounded = 'rounded-tr-2xl';
      return `${theme.greenBase} ${rounded} ${theme.cellBorder}`;
    }
    if (isYellowBase) {
      let rounded = '';
      if (x === 0 && y === 14) rounded = 'rounded-bl-2xl';
      return `${theme.yellowBase} ${rounded} ${theme.cellBorder}`;
    }
    if (isBlueBase) {
      let rounded = '';
      if (x === 14 && y === 14) rounded = 'rounded-br-2xl';
      return `${theme.blueBase} ${rounded} ${theme.cellBorder}`;
    }

    // Se está na Reta Final segura
    if (isRedHome) return 'bg-rose-500/35 border-rose-500/30';
    if (isGreenHome) return 'bg-emerald-500/35 border-emerald-500/30';
    if (isYellowHome) return 'bg-amber-500/35 border-amber-500/30';
    if (isBlueHome) return 'bg-indigo-500/35 border-indigo-500/30';

    // Se são Casas de Saída (Starts)
    if (isRedStart) return 'bg-rose-500/75 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]';
    if (isGreenStart) return 'bg-emerald-500/75 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    if (isYellowStart) return 'bg-amber-500/75 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
    if (isBlueStart) return 'bg-indigo-500/75 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]';

    // Centro do Tabuleiro (Grande Chegada)
    if (isCenter) {
      let rounded = '';
      if (x === 6 && y === 6) rounded = 'rounded-tl-xl';
      if (x === 8 && y === 6) rounded = 'rounded-tr-xl';
      if (x === 6 && y === 8) rounded = 'rounded-bl-xl';
      if (x === 8 && y === 8) rounded = 'rounded-br-xl';
      return `${theme.centerBg} ${rounded} ${theme.cellBorder}`;
    }

    // Trilha Comum Normal (Acrílico Translúcido de Vidro)
    const isTrack = (x >= 6 && x <= 8) || (y >= 6 && y <= 8);
    if (isTrack) return `${theme.trackBg} ${theme.cellBorder}`;

    return `bg-transparent ${theme.cellBorder}`;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center py-6 select-none animate-in fade-in duration-300 relative">
      
      {/* 📊 PAINEL ESTATÍSTICO DE JOGO (ESQUERDA) */}
      <div className="w-64 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none shadow-2xl z-10">
        <div className="flex justify-between items-start w-full">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Ludo de 4 Jogadores</span>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
          </div>
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title="Como Jogar"
          >
            <HelpCircle size={14} />
          </button>
        </div>

        {/* 🎨 SELETOR DE SKINS E TEMAS ESTÉTICOS */}
        <div className="space-y-1.5">
          <span className="text-[7px] font-black text-gray-500 uppercase">Tema do Tabuleiro</span>
          <div className="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
            {(['cyberpunk', 'wood', 'holographic'] as LudoSkin[]).map(skin => (
              <button
                key={skin}
                onClick={() => setCurrentSkin(skin)}
                className={`py-1.5 text-[7px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  currentSkin === skin
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {skin === 'cyberpunk' ? 'Tron' : skin === 'wood' ? 'Madeira' : 'Holog'}
              </button>
            ))}
          </div>
        </div>

        {/* 🎵 BOTÃO DE CONTROLE DE MÚSICA PROCEDURAL COM EQUALIZADOR */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-gray-500 uppercase">Som da Arena</span>
            <span className="text-[8px] font-bold text-white">Música Lofi</span>
          </div>

          <button
            onClick={toggleMusic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMusicPlaying
              ? 'bg-gradient-to-br from-indigo-500 to-rose-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
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

        {/* Listagem das 4 Cores e Turnos */}
        <div className="flex flex-col gap-2">
          {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map(color => {
            const themeInfo = LUDO_COLORS_THEME[color];
            const isTurn = activeColor === color;
            const wins = currentBoard.tokens.filter(t => t.color === color && t.position === 105).length;
            const label = getPlayerLabel(color);
            
            return (
              <div key={color} className={`p-3 rounded-2xl border flex flex-col gap-1 relative overflow-hidden transition-all ${
                isTurn ? `${themeInfo.border} bg-white/5` : 'bg-transparent border-white/5 opacity-40'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-black uppercase ${themeInfo.text}`}>{label}</span>
                  <span className="text-[9px] font-black text-white">{wins}/4 Finalizadas</span>
                </div>
                {isTurn && (
                  <span className={`text-[7px] font-black uppercase mt-1 animate-pulse ${themeInfo.text}`}>
                    {isLocal 
                      ? (color === 'red' ? 'Sua Vez!' : 'Pensando (CPU)...')
                      : (activeColor === myColor 
                          ? 'Sua Vez!' 
                          : (isCpuActiveColor(color) ? 'Pensando (CPU)...' : 'Aguardando Jogador...')
                        )
                    }
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 🎲 DADO DA SORTE */}
        <div className="flex flex-col items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <span className="text-[8px] font-black text-gray-500 uppercase">Dado da Sorte</span>
          
          <motion.button
            whileHover={isMyTurn && !currentBoard.hasRolled ? { scale: 1.08, y: -2 } : {}}
            whileTap={isMyTurn && !currentBoard.hasRolled ? { scale: 0.95 } : {}}
            onClick={handleRollDice}
            disabled={!isMyTurn || currentBoard.hasRolled || diceRolling || !!currentBoard.winnerColor}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl font-black transition-all relative ${
              isMyTurn && !currentBoard.hasRolled
              ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-rose-600 border-indigo-400/40 text-white cursor-pointer shadow-lg shadow-indigo-500/35'
              : 'bg-slate-900 border-white/5 text-gray-600'
            }`}
          >
            {diceRolling ? (
              <motion.div
                animate={{ 
                  rotate: [0, 360, 720, 1080], 
                  scale: [1, 1.2, 0.9, 1.1, 1] 
                }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                🎲
              </motion.div>
            ) : (
              currentBoard.diceValue !== null ? currentBoard.diceValue : '🎲'
            )}
          </motion.button>

          {currentBoard.diceValue !== null && !diceRolling && (
            <span className="text-[9px] font-bold text-white uppercase tracking-widest animate-pulse font-mono">
              Rolou: {currentBoard.diceValue}!
            </span>
          )}
        </div>

        {/* Botão de Reset e Abandonar */}
        {isLocal && (
          <button 
            onClick={handleRestartLocalGame}
            className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
          >
            🔄 Recomeçar Partida
          </button>
        )}

        <button 
          onClick={handleLeaveGame}
          className="mt-auto py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-[9px] font-black text-rose-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
        >
          🏳️ Abandonar Arena
        </button>
      </div>

      {/* 👑 TABULEIRO DE LUDO 15X15 LUXUOSO NEON (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
        
        {/* REAÇÕES FLUTUANTES (Balões de fala que sobem flutuando) */}
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
                boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`
              }}
            />
          ))}
        </div>
        
        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem]">
          {/* Luz de fundo de efeito premium */}
          <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] blur-3xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Ludo 15x15 */}
          <div className={`relative z-10 grid grid-cols-15 grid-rows-15 w-[384px] h-[384px] p-1.5 overflow-hidden border rounded-2xl ${theme.boardBg}`}>
            {Array(15).fill(null).map((_, y) => (
              <React.Fragment key={y}>
                {Array(15).fill(null).map((_, x) => {
                  const cellClass = renderLudoCellDesign(x, y);
                  const socketColor = isLudoSocketCell(x, y);

                  // Encontra as fichas localizadas nesta coordenada do circuito
                  const tokensHere = currentBoard.tokens.filter(t => {
                    const coords = getLudoCoords(t.color, t);
                    return coords.x === x && coords.y === y;
                  });

                  return (
                    <div
                      key={x}
                      className={`w-full h-full border-[0.5px] flex items-center justify-center relative transition-all ${cellClass}`}
                    >
                      {/* Desenha nicho/soquete de garagem se for uma coordenada de base circular */}
                      {socketColor && (
                        <div className={`absolute w-7 h-7 rounded-full ${theme.socketBg} z-0`} />
                      )}

                      {/* Efeito visual na reta final e centro */}
                      {x === 7 && y === 7 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse z-0" />
                      )}

                      {/* Desenha estrelas de proteção nas casas seguras intermediárias */}
                      {((x === 6 && y === 2) || (x === 12 && y === 6) || (x === 8 && y === 12) || (x === 2 && y === 8)) && (
                        <Star className="w-3.5 h-3.5 text-yellow-500/40 fill-yellow-500/10 absolute z-0 animate-pulse" />
                      )}

                      {/* Desenha as fichas da casa atual de forma empilhada ou orbitando */}
                      {tokensHere.length > 0 && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {tokensHere.map((token, tIdx) => {
                            const isMyToken = token.color === myColor;
                            const isClickable = isMyTurn && currentBoard.hasRolled && canLudoTokenMove(currentBoard, token, currentBoard.diceValue!) && isMyToken;

                            // Posicionamento de Órbita Circular elegante se houver múltiplas fichas na mesma casa!
                            const count = tokensHere.length;
                            let transformStyle = 'none';
                            if (count > 1) {
                              const angle = (tIdx / count) * 2 * Math.PI;
                              const radius = 6;
                              const tx = Math.round(Math.cos(angle) * radius);
                              const ty = Math.round(Math.sin(angle) * radius);
                              transformStyle = `translate(${tx}px, ${ty}px)`;
                            }

                            return (
                              <motion.div
                                key={`${token.color}-${token.id}`}
                                layoutId={`ludo-token-${token.color}-${token.id}`}
                                onClick={() => isClickable && handleSelectToken(token)}
                                style={{
                                  position: 'absolute',
                                  transform: transformStyle,
                                  zIndex: 10 + tIdx
                                }}
                                className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                  token.color === 'red' ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.6)]' :
                                  token.color === 'green' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]' :
                                  token.color === 'yellow' ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' :
                                  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                                } ${
                                  isClickable
                                  ? 'ring-2 ring-white scale-125 border-indigo-400 z-50 animate-bounce'
                                  : 'border border-white/20'
                                }`}
                              >
                                <div className="w-2.5 h-2.5 rounded-full border border-white/10 flex items-center justify-center bg-white/10">
                                  <span className="text-[6px] text-white/90 font-bold">{token.id + 1}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 💬 BARRA DE CHAT DE REAÇÕES DE EMOJIS RÁPIDOS */}
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

      <AnimatePresence>
        {showHelp && (
          <GameHelpModal 
            gameType="ludo" 
            skin={currentSkin === 'cyberpunk' ? 'cyberpunk' : 'classic'} 
            onClose={() => setShowHelp(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
