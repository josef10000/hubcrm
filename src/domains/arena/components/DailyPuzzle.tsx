import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { getDailyPuzzle, DailyPuzzleData } from '../helpers/puzzlesData';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, HelpCircle, AlertCircle, RefreshCw, Clock, ArrowLeft, Coins, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface DailyPuzzleProps {
  onBack?: () => void;
  onSolved?: () => void;
}

export function DailyPuzzle({ onBack, onSolved }: DailyPuzzleProps) {
  const { user, userProfile } = useAuth();
  
  // Data de hoje formatada (ex: 2026-05-25)
  const todayKey = new Date().toISOString().split('T')[0];
  const puzzle = getDailyPuzzle(todayKey);

  // Estados
  const [board, setBoard] = useState<any>(JSON.parse(JSON.stringify(puzzle.initialBoardState)));
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [hasAlreadySolvedToday, setHasAlreadySolvedToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sonoplastia Procedural Retro (Web Audio API)
  const playProceduralSound = (type: 'win' | 'fail' | 'click') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'win') {
        // Arpejo ascendente de vitória
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.26);
        });
      } else if (type === 'fail') {
        // Som grave de erro
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.32);
      }
    } catch (e) {
      console.warn('Audio procedural desabilitado no navegador:', e);
    }
  };

  // Verifica se o usuário já resolveu o puzzle de hoje na Firestore
  useEffect(() => {
    async function checkSolvedStatus() {
      if (!user?.uid) return;
      try {
        const solverDocRef = doc(db, 'dailyPuzzleSolvers', `${todayKey}_${user.uid}`);
        const solverSnap = await getDoc(solverDocRef);
        if (solverSnap.exists()) {
          setHasAlreadySolvedToday(true);
          setIsSolved(true);
          const data = solverSnap.data();
          if (data?.timeSeconds) setElapsedTime(data.timeSeconds);
        }
      } catch (err) {
        console.error('Erro ao buscar status de solver:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkSolvedStatus();
  }, [user?.uid, todayKey]);

  // Cronômetro de tempo
  useEffect(() => {
    if (!isSolved && !isLoading && !hasAlreadySolvedToday) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSolved, isLoading, hasAlreadySolvedToday]);

  const handleReset = () => {
    playProceduralSound('click');
    setBoard(JSON.parse(JSON.stringify(puzzle.initialBoardState)));
    setSelectedCell(null);
    setShowHint(false);
    toast.info('Desafio reiniciado! Cronômetro mantido.');
  };

  // Executa a conclusão com êxito do puzzle
  const handleSuccess = async () => {
    if (isSolved || hasAlreadySolvedToday || !user?.uid) return;
    
    setIsSolved(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Efeitos
    playProceduralSound('win');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const tId = toast.loading('Registrando sua vitória diária...');
    try {
      const solverDocRef = doc(db, 'dailyPuzzleSolvers', `${todayKey}_${user.uid}`);
      
      // Grava o registro da conquista
      await setDoc(solverDocRef, {
        uid: user.uid,
        displayName: user.displayName || 'Colaborador',
        photoURL: user.photoURL || null,
        solvedAt: Date.now(),
        timeSeconds: elapsedTime,
        date: todayKey
      });

      // Bonifica o usuário logado com +50 moedas no perfil
      const userRef = doc(db, 'profiles', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const credits = userSnap.data().arenaCredits || 0;
        await updateDoc(userRef, {
          arenaCredits: credits + 50
        });
      }

      toast.success('Desafio do Dia Concluído! Recompensa de +50 Hub Coins garantida.', { id: tId });
      if (onSolved) onSolved();
    } catch (err) {
      toast.error('Erro ao computar recompensa.', { id: tId });
    }
  };

  // Handler de jogada para Xadrez
  const handleChessCellClick = (row: number, col: number) => {
    if (isSolved || hasAlreadySolvedToday) return;
    playProceduralSound('click');
    const cellKey = `${row},${col}`;
    const piece = board.pieces[cellKey];

    if (!selectedCell) {
      // Seleciona a peça (apenas se for do Jogador 1)
      if (piece && piece.player === 1) {
        setSelectedCell(cellKey);
      }
    } else {
      // Executa o movimento
      const from = selectedCell;
      const to = cellKey;

      if (from === to) {
        setSelectedCell(null);
        return;
      }

      // Valida o lance contra a solução correta
      if (puzzle.targetMove.from === from && puzzle.targetMove.to === to) {
        // Atualiza o tabuleiro
        const newPieces = { ...board.pieces };
        const movingPiece = newPieces[from];
        delete newPieces[from];
        newPieces[to] = movingPiece;
        
        setBoard({ pieces: newPieces });
        setSelectedCell(null);
        handleSuccess();
      } else {
        // Movimento Incorreto
        playProceduralSound('fail');
        toast.error('Estratégia incorreta! Esse movimento não gera o mate esperado.');
        setSelectedCell(null);
      }
    }
  };

  // Handler de jogada para Connect 4
  const handleConnect4ColumnClick = (col: number) => {
    if (isSolved || hasAlreadySolvedToday) return;
    playProceduralSound('click');

    // Valida a coluna contra a solução correta
    if (puzzle.targetMove.toCol === col) {
      // Faz a peça cair no tabuleiro
      const newGrid = board.map((r: any) => [...r]);
      let targetRow = -1;
      for (let r = 5; r >= 0; r--) {
        if (newGrid[r][col] === null) {
          targetRow = r;
          break;
        }
      }

      if (targetRow !== -1) {
        newGrid[targetRow][col] = 1; // Jogador 1
        setBoard(newGrid);
        handleSuccess();
      }
    } else {
      // Coluna Errada
      playProceduralSound('fail');
      toast.error('Oponente bloqueou ou alinhou! Tente uma coluna diferente.');
    }
  };

  // Formata o cronômetro para MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50 select-none">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Acessando Desafio do Dia...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/20 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl relative select-none overflow-hidden max-w-4xl mx-auto">
      
      {/* Glow de Fundo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
        <div className="space-y-1">
          <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
            🧩 Desafio Diário de Tabuleiro
          </span>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide mt-2">{puzzle.title}</h2>
          <p className="text-xs text-gray-400 font-bold leading-relaxed">{puzzle.description}</p>
        </div>

        {/* Cronômetro / Status */}
        <div className="flex items-center gap-4 bg-slate-950/40 border border-white/5 p-4 rounded-3xl shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={16} className={isSolved ? 'text-emerald-400' : 'text-cyan-400 animate-pulse'} />
            <span className={`font-mono text-lg font-black tracking-widest ${isSolved ? 'text-emerald-400' : 'text-white'}`}>
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-white/5" />
          <div className="space-y-0.5">
            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest block">Recompensa</span>
            <span className="text-xs font-black text-yellow-400 flex items-center gap-1">
              <Coins size={12} className="text-yellow-400 animate-bounce" />
              +50 Hub Coins
            </span>
          </div>
        </div>
      </div>

      {/* Grid Central */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start relative z-10">
        
        {/* Lado Esquerdo: O Tabuleiro (3/5) */}
        <div className="md:col-span-3 flex justify-center">
          
          {/* Tabuleiro de Xadrez */}
          {puzzle.gameType === 'chess' && (
            <div className="bg-slate-950/50 p-6 border border-white/5 rounded-[2rem] shadow-xl">
              <div className="grid grid-cols-8 grid-rows-8 w-72 h-72 border border-slate-800 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                {Array(8).fill(null).map((_, rIdx) => {
                  return Array(8).fill(null).map((__, cIdx) => {
                    const cellKey = `${rIdx},${cIdx}`;
                    const piece = board.pieces[cellKey];
                    const isDark = (rIdx + cIdx) % 2 === 1;
                    const isSelected = selectedCell === cellKey;

                    // Peças de Xadrez Unicode
                    const CHESS_UNICODE: Record<string, string> = {
                      king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
                    };

                    return (
                      <div
                        key={cellKey}
                        onClick={() => handleChessCellClick(rIdx, cIdx)}
                        className={`w-9 h-9 flex items-center justify-center text-xl font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-500/30 ring-2 ring-cyan-400 ring-inset shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                            : isDark
                            ? 'bg-slate-900 hover:bg-slate-800'
                            : 'bg-slate-950 hover:bg-slate-900'
                        }`}
                      >
                        {piece && (
                          <span
                            className={`select-none transition-transform active:scale-95 ${
                              piece.player === 1
                                ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]'
                                : 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                            }`}
                          >
                            {CHESS_UNICODE[piece.type]}
                          </span>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* Tabuleiro de Connect 4 */}
          {puzzle.gameType === 'connect4' && (
            <div className="bg-[#0f1124] p-6 border border-indigo-500/15 rounded-[2rem] shadow-xl flex flex-col gap-3">
              {/* Botões de Ação para Soltar Fichas no Topo */}
              <div className="grid grid-cols-7 w-72 gap-2 text-center">
                {Array(7).fill(null).map((_, cIdx) => (
                  <button
                    key={`drop-${cIdx}`}
                    onClick={() => handleConnect4ColumnClick(cIdx)}
                    disabled={isSolved || hasAlreadySolvedToday}
                    className="py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-500 hover:text-cyan-400 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ↓
                  </button>
                ))}
              </div>

              {/* Grade de Células */}
              <div className="grid grid-cols-7 grid-rows-6 w-72 h-60 gap-2 p-3 bg-slate-950/80 border border-white/5 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                {board.map((row: any, rIdx: number) => {
                  return row.map((cell: any, cIdx: number) => {
                    return (
                      <div
                        key={`c4-${rIdx}-${cIdx}`}
                        className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center relative overflow-hidden bg-slate-900/30"
                      >
                        {cell && (
                          <motion.div
                            initial={{ y: -60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`w-6 h-6 rounded-full border shadow-md ${
                              cell === 1
                                ? 'bg-cyan-500 border-cyan-400 shadow-cyan-500/20'
                                : 'bg-pink-500 border-pink-400 shadow-pink-500/20'
                            }`}
                          />
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

        </div>

        {/* Lado Direito: Informações e Ações (2/5) */}
        <div className="md:col-span-2 flex flex-col gap-4 h-full justify-between">
          
          <div className="space-y-4">
            <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Instruções do Lance</span>
              <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                {puzzle.gameType === 'chess' 
                  ? 'Clique na peça roxa e arraste ou clique na casa de destino para dar o xeque-mate fatal.' 
                  : 'Selecione uma das setas no topo para soltar a ficha ciano na coluna correta.'}
              </p>
            </div>

            {/* Dica do Puzzle */}
            <div className="space-y-2">
              <button
                onClick={() => { playProceduralSound('click'); setShowHint(!showHint); }}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer"
              >
                <HelpCircle size={12} />
                {showHint ? 'Ocultar Dica' : 'Exibir Dica'}
              </button>
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 rounded-xl text-[9px] font-bold uppercase tracking-wider leading-relaxed"
                  >
                    {puzzle.hint}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Estado de Conclusão / Ações do Fundo */}
          <div className="space-y-3 pt-6 border-t border-white/5">
            {isSolved || hasAlreadySolvedToday ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center gap-3 text-center">
                <CheckCircle className="text-emerald-400 shrink-0" size={32} />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Desafio Superado!</h4>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
                    Você resolveu o puzzle de hoje em <span className="text-white font-mono">{formatTime(elapsedTime)}</span> e faturou a recompensa!
                  </p>
                </div>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Voltar para o Lobby
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  Reiniciar
                </button>
                {onBack && (
                  <button
                    onClick={() => { playProceduralSound('click'); onBack(); }}
                    className="flex-1 py-3 bg-slate-950/40 hover:bg-slate-950 border border-white/5 text-gray-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                  >
                    Desistir
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
