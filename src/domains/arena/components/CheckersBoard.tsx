import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { CheckersGrid, CheckersMove, getCheckersValidMoves, applyCheckersMove, checkCheckersWinner, getBestCheckersMove, getCheckersMaxCaptureSequences } from '../helpers/checkersLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { HelpCircle } from 'lucide-react';
import { GameHelpModal } from './GameHelpModal';

interface CheckersBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// -----------------------------------------------------------------
// SISTEMA DE ÁUDIO RETRÔ 8-BITS PROCEDURAL (WEB AUDIO API)
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
      if (!checkersAudioCtx || checkersAudioCtx.state === 'suspended') return;
      const now = checkersAudioCtx.currentTime;
      const chord = arpeggios[chordIdx % arpeggios.length];
      const freq = chord[noteIdx % chord.length];
      
      const osc = checkersAudioCtx.createOscillator();
      const gain = checkersAudioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      
      osc.connect(gain);
      gain.connect(checkersAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
      
      noteIdx++;
      if (noteIdx % 8 === 0) {
        chordIdx++;
      }
    };
    
    playNote();
    checkersMusicInterval = setInterval(playNote, 240);
  } catch (e) {
    console.warn('Erro ao reproduzir chiptune:', e);
  }
}

// Efeitos sonoros Chiptune 8-Bits para Damas
function playCheckersRetroSound(type: 'move' | 'capture' | 'crown' | 'win') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.07);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.16);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'crown') {
      const notes = [
        { f: 293.66, t: 0 }, { f: 349.23, t: 0.06 }, { f: 440.00, t: 0.12 }, { f: 587.33, t: 0.18 }
      ];
      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(0.04, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.12);
      });
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
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.25);
      });
    }
  } catch (e) {}
}

// -----------------------------------------------------------------
// SKINS E TEMAS ESTÉTICOS DE LUXO COM FILTRO RETRÔ ARCADE CRT
// -----------------------------------------------------------------
type CheckersSkin = 'cyberpunk' | 'wood' | 'holographic' | 'arcade';

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
  },
  arcade: {
    boardBg: 'bg-[#120324] border-purple-500/30 shadow-[0_20px_50px_rgba(236,72,153,0.18)] relative overflow-hidden after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] after:bg-[length:100%_4px,3px_100%] after:pointer-events-none after:animate-pulse',
    darkSquare: 'bg-[#2a085c]',
    lightSquare: 'bg-[#4c1c8c]',
    p1Piece: 'bg-gradient-to-br from-[#00ffff] to-[#00cccc] shadow-[0_0_15px_rgba(0,255,255,0.7)]',
    p2Piece: 'bg-gradient-to-br from-[#ff00ff] to-[#cc00cc] shadow-[0_0_15px_rgba(255,0,255,0.7)]'
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
  const [showHelp, setShowHelp] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<CheckersSkin>('cyberpunk');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Estados para gerenciar as capturas em cadeia de maioria
  const [chainMoves, setChainMoves] = useState<CheckersMove[]>([]);
  const [chainPiece, setChainPiece] = useState<[number, number] | null>(null);
  const [pendingCaptures, setPendingCaptures] = useState<[number, number][]>([]);
  const [comboStreak, setComboStreak] = useState(0);
  const [comboMessage, setComboMessage] = useState<string | null>(null);

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

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopCheckersProceduralMusic();
      setIsMusicPlaying(false);
      toast.info('Música ambiente pausada');
    } else {
      playCheckersProceduralMusic();
      setIsMusicPlaying(true);
      toast.success('Música ambiente chiptune ativada 🎵');
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

    // Se a cadeia estiver ativa, o jogador só pode clicar na peça da cadeia!
    if (chainPiece && (chainPiece[0] !== r || chainPiece[1] !== c)) {
      toast.warning('Você deve continuar a captura em cadeia com a mesma peça!');
      return;
    }

    const piece = currentGrid[r][c];
    if (piece && piece.player === myPlayerNum) {
      const hasCaptures = validMoves.some(m => m.captures);
      const pieceMoves = validMoves.filter(m => m.from[0] === r && m.from[1] === c);
      
      if (hasCaptures && pieceMoves.length === 0) {
        toast.warning('Você é obrigado a capturar peças adversárias nesta rodada! (Regra da Maioria)');
        return;
      }
      
      setSelectedPiece([r, c]);
    }
  };

  const handleCellClick = async (r: number, c: number) => {
    if (!selectedPiece) return;

    // Se a cadeia estiver ativa, o jogador só pode mover a peça da cadeia!
    if (chainPiece && (selectedPiece[0] !== chainPiece[0] || selectedPiece[1] !== chainPiece[1])) {
      toast.warning('Você deve continuar a captura em cadeia com a mesma peça!');
      return;
    }

    const targetMove = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (!targetMove) {
      const piece = currentGrid[r][c];
      if (chainPiece) return; // Impede mudar de seleção no meio da cadeia

      if (piece && piece.player === myPlayerNum) {
        handlePieceClick(r, c);
      } else {
        setSelectedPiece(null);
      }
      return;
    }

    // Executa a jogada intermediária
    const nextGrid = applyCheckersMove(currentGrid, targetMove);
    
    if (targetMove.captures) {
      playCheckersRetroSound('capture');
      triggerExplosion(c, r, '#ef4444');
    } else {
      playCheckersRetroSound('move');
    }

    // Se for uma captura, verifica se faz parte de uma sequência mais longa (captura em cadeia)
    if (targetMove.captures) {
      const nextPending = [...pendingCaptures, targetMove.captures];
      
      // Encontrar as sequências máximas que iniciam com o caminho de movimentos atual
      const maxSeqs = getCheckersMaxCaptureSequences(currentGrid, myPlayerNum);
      const currentPath = [...chainMoves, targetMove];
      
      const matchingSeqs = maxSeqs.filter(seq => {
        if (seq.length < currentPath.length) return false;
        for (let i = 0; i < currentPath.length; i++) {
          if (seq[i].from[0] !== currentPath[i].from[0] || seq[i].from[1] !== currentPath[i].from[1] ||
              seq[i].to[0] !== currentPath[i].to[0] || seq[i].to[1] !== currentPath[i].to[1]) {
            return false;
          }
        }
        return true;
      });

      if (matchingSeqs.length > 0 && matchingSeqs[0].length > currentPath.length) {
        // A cadeia CONTINUA!
        setChainMoves(currentPath);
        setChainPiece([r, c]);
        setPendingCaptures(nextPending);
        setLocalGrid(nextGrid);
        
        const nextStreak = comboStreak + 1;
        setComboStreak(nextStreak);
        setComboMessage(nextStreak === 1 ? 'DOUBLE CAPTURE! 💥' : `COMBO STREAK x${nextStreak + 1}! 🔥`);
        setTimeout(() => setComboMessage(null), 1500);

        setSelectedPiece([r, c]);
        toast.info('💥 Captura múltipla! Continue saltando.');
        return;
      } else {
        // A cadeia TERMINOU!
        // Remove as peças comidas definitivamente
        const finalGrid = nextGrid.map(row => [...row]);
        for (const [capR, capC] of nextPending) {
          finalGrid[capR][capC] = null;
        }

        // Verifica promoção
        const isPromoted = finalGrid[r][c]?.type === 'king' && currentGrid[selectedPiece[0]][selectedPiece[1]]?.type === 'normal';
        if (isPromoted) {
          playCheckersRetroSound('crown');
          checkCheckersAchievements('chk_king', 'Voo Majestoso', 'Promoveu uma peça a Dama Brasileira de longo alcance.', '👑');
          toast.success('👑 Coroação da Dama! Voo de longo alcance desbloqueado.');
        }

        setChainMoves([]);
        setChainPiece(null);
        setPendingCaptures([]);
        setComboStreak(0);
        setSelectedPiece(null);

        const winResult = checkCheckersWinner(finalGrid);
        if (isLocal) {
          setLocalGrid(finalGrid);
          if (winResult) {
            setWinnerPlayer(winResult);
            playCheckersRetroSound('win');
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            toast.success('Parabéns! Você venceu o computador! 🏆');
            checkCheckersAchievements('chk_win', 'Mestre das Damas', 'Venceu uma partida de Damas na Hub Arena.', '🏆');
            return;
          }
          setLocalTurn('computer');
        } else {
          const winnerUserId = winResult ? user?.uid : undefined;
          await makeMove(finalGrid, `${targetMove.from.join(',')}-${targetMove.to.join(',')}`, winnerUserId);
          if (winResult) {
            playCheckersRetroSound('win');
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          }
        }
      }
    } else {
      // Movimento comum
      setSelectedPiece(null);
      const winResult = checkCheckersWinner(nextGrid);
      if (isLocal) {
        setLocalGrid(nextGrid);
        if (winResult) {
          setWinnerPlayer(winResult);
          playCheckersRetroSound('win');
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          toast.success('Parabéns! Você venceu! 🏆');
          return;
        }
        setLocalTurn('computer');
      } else {
        const winnerUserId = winResult ? user?.uid : undefined;
        await makeMove(nextGrid, `${targetMove.from.join(',')}-${targetMove.to.join(',')}`, winnerUserId);
        if (winResult) {
          playCheckersRetroSound('win');
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
      }
    }
  };

  // Efeito da IA no Damas (capturas em cadeia visuais integradas de maioria)
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerPlayer) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        const bestMove = getBestCheckersMove(localGrid, aiDifficulty, 2);
        
        if (bestMove) {
          if (bestMove.captures) {
            const aiSeqs = getCheckersMaxCaptureSequences(localGrid, 2);
            const matchingAiSeqs = aiSeqs.filter(seq => 
              seq[0].from[0] === bestMove.from[0] && seq[0].from[1] === bestMove.from[1] &&
              seq[0].to[0] === bestMove.to[0] && seq[0].to[1] === bestMove.to[1]
            );
            const selectedSeq = matchingAiSeqs.length > 0 ? matchingAiSeqs[0] : [bestMove];
            
            let stepIdx = 0;
            let currentBoardSim = localGrid;
            const capturedCoordsAccum: [number, number][] = [];

            const executeAiStep = () => {
              if (stepIdx < selectedSeq.length) {
                const stepMove = selectedSeq[stepIdx];
                currentBoardSim = applyCheckersMove(currentBoardSim, stepMove);
                
                playCheckersRetroSound('capture');
                triggerExplosion(stepMove.to[1], stepMove.to[0], '#ef4444');
                
                if (stepMove.captures) {
                  capturedCoordsAccum.push(stepMove.captures);
                }

                setLocalGrid(currentBoardSim);
                stepIdx++;
                setTimeout(executeAiStep, 450);
              } else {
                // Finaliza turno CPU e remove comidas definitivamente
                const finalAiGrid = currentBoardSim.map(row => [...row]);
                for (const [cr, cc] of capturedCoordsAccum) {
                  finalAiGrid[cr][cc] = null;
                }

                const lastMove = selectedSeq[selectedSeq.length - 1];
                const isPromoted = finalAiGrid[lastMove.to[0]][lastMove.to[1]]?.type === 'king' &&
                                   localGrid[bestMove.from[0]][bestMove.from[1]]?.type === 'normal';
                
                if (isPromoted) {
                  playCheckersRetroSound('crown');
                  toast.error('👑 A CPU promoveu uma peça a Dama!');
                }

                setLocalGrid(finalAiGrid);
                
                const winResult = checkCheckersWinner(finalAiGrid);
                if (winResult) {
                  setWinnerPlayer(winResult);
                  playCheckersRetroSound('win');
                  toast.error('O computador venceu a partida!');
                } else {
                  setLocalTurn(user?.uid || 'player1');
                }
                setIsAiThinking(false);
              }
            };
            
            executeAiStep();
          } else {
            const nextGrid = applyCheckersMove(localGrid, bestMove);
            playCheckersRetroSound('move');
            setLocalGrid(nextGrid);

            const winResult = checkCheckersWinner(nextGrid);
            if (winResult) {
              setWinnerPlayer(winResult);
              playCheckersRetroSound('win');
              toast.error('O computador venceu a partida!');
            } else {
              setLocalTurn(user?.uid || 'player1');
            }
            setIsAiThinking(false);
          }
        } else {
          setWinnerPlayer(1);
          playCheckersRetroSound('win');
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          toast.success('Você venceu! O computador ficou bloqueado.');
          checkCheckersAchievements('chk_win', 'Mestre das Damas', 'Venceu a IA bloqueando seus movimentos.', '🏆');
          setIsAiThinking(false);
        }
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
        <div className="flex justify-between items-start w-full">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Damas Clássicas</span>
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
        
        {/* Banner de Combo Streak */}
        <AnimatePresence>
          {comboMessage && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: -40 }}
              animate={{ scale: 1.2, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 40 }}
              className="absolute top-12 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 border border-white/20 px-6 py-2.5 rounded-2xl shadow-[0_0_25px_rgba(236,72,153,0.5)] z-50 text-center font-black tracking-widest text-[9px] text-white uppercase animate-pulse select-none"
            >
              {comboMessage}
            </motion.div>
          )}
        </AnimatePresence>

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
                  const isPendingCap = pendingCaptures.some(([pr, pc]) => pr === rIdx && pc === cIdx);

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
                          } ${
                            isPendingCap ? 'opacity-30 scale-90 ring-1 ring-rose-500/50' : ''
                          }`}
                        >
                          {/* Marcação de captura pendente de retirada (✕) */}
                          {isPendingCap && (
                            <div className="absolute inset-0 flex items-center justify-center bg-rose-500/25 rounded-full z-20 pointer-events-none">
                              <span className="text-rose-500 text-lg font-black leading-none">✕</span>
                            </div>
                          )}

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

      <AnimatePresence>
        {showHelp && (
          <GameHelpModal 
            gameType="checkers" 
            skin={currentSkin === 'cyberpunk' ? 'cyberpunk' : 'classic'} 
            onClose={() => setShowHelp(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
