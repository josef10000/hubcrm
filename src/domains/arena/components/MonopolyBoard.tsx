import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, StarOff, Play, Settings, RefreshCw, StarHalf } from 'lucide-react';
import { GameMatch, useArenaStore } from '@store/useArenaStore';

interface MonopolyBoardProps {
  match: any;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function MonopolyBoard({ match, isLocal, aiDifficulty, onExit }: MonopolyBoardProps) {
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);
  
  // Estado local para a Skin ativa (classic ou cyberpunk)
  const [skin, setSkin] = useState<'classic' | 'cyberpunk'>('classic');
  const [diceValues, setDiceValues] = useState<[number, number] | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const players = match.boardState?.players || [];
  const log = match.boardState?.log || ['Aguardando início...'];

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    
    // Simula rolar dados de 1 a 6
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    
    setTimeout(() => {
      setDiceValues([d1, d2]);
      setIsRolling(false);
      
      // Lógica de jogada no boardState local/Firestore
      if (match.boardState) {
        const nextState = { ...match.boardState };
        const activePlayerIdx = nextState.players.findIndex((p: any) => p.id === match.turn);
        if (activePlayerIdx !== -1) {
          const player = nextState.players[activePlayerIdx];
          const newPos = (player.position + d1 + d2) % 40;
          player.position = newPos;
          nextState.log = [
            `${player.name} rolou [${d1}, ${d2}] e avançou para a casa ${newPos}`,
            ...nextState.log
          ].slice(0, 10);
        }
        makeMove(nextState, `${match.player1Name} rolou os dados.`);
      }
    }, 1000);
  };

  const handleToggleSkin = () => {
    setSkin(prev => prev === 'classic' ? 'cyberpunk' : 'classic');
  };

  return (
    <div className={`w-full min-h-[calc(100vh-140px)] rounded-[2.5rem] p-6 transition-all duration-500 border ${
      skin === 'cyberpunk'
      ? 'bg-slate-950/80 border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] text-white'
      : 'bg-gradient-to-br from-amber-900/10 to-stone-900/40 border-amber-500/20 text-stone-200'
    }`}>
      {/* Header do Jogo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-500/15 rounded-2xl">
            <span className="text-2xl">💰</span>
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest">MONOPOLY CORPORATIVO</h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              Modo: {isLocal ? 'Singleplayer' : 'Multiplayer'} | Skin ativa:{' '}
              <span className={skin === 'cyberpunk' ? 'text-purple-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                {skin.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Troca de Skin */}
          <button 
            onClick={handleToggleSkin}
            className={`px-4 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              skin === 'cyberpunk'
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            }`}
          >
            🎨 Mudar Tema ({skin === 'classic' ? 'Cyberpunk' : 'Clássico'})
          </button>
          
          <button 
            onClick={onExit || exitActiveMatch}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 text-[9px] font-black text-gray-400 hover:text-rose-400 uppercase tracking-widest transition-all cursor-pointer"
          >
            Sair do Jogo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Tabuleiro de Monopoly (Esboço 11x11 ou visual premium de desenvolvimento) */}
        <div className="lg:col-span-2 flex items-center justify-center p-4 bg-black/30 border border-white/5 rounded-3xl min-h-[450px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-4xl animate-bounce">🎲</div>
            <h3 className="text-base font-black uppercase tracking-wider">Tabuleiro Monopoly em Construção</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              A arquitetura do tabuleiro 11x11 interativo com suporte a skins e compra de propriedades está mapeada na Fase 2 da checklist. Use o painel lateral para testar a rolagem dos dados e ver a sincronização do log!
            </p>
            <div className="flex justify-center gap-4 py-2">
              <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold">4 Jogadores Ativos</span>
              <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold">100% Multiplayer</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Jogadores, Dados & Histórico */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Lançador de Dados */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-4 text-center">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider w-full text-left">Lançamento de Dados</h4>
            
            <div className="flex gap-4 my-2">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl font-black shadow-lg ${
                skin === 'cyberpunk' ? 'bg-purple-950/40 border-purple-500/30 text-purple-400' : 'bg-stone-900 border-amber-500/30 text-amber-500'
              } ${isRolling ? 'animate-spin' : ''}`}>
                {diceValues ? diceValues[0] : '?'}
              </div>
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl font-black shadow-lg ${
                skin === 'cyberpunk' ? 'bg-purple-950/40 border-purple-500/30 text-purple-400' : 'bg-stone-900 border-amber-500/30 text-amber-500'
              } ${isRolling ? 'animate-spin' : ''}`}>
                {diceValues ? diceValues[1] : '?'}
              </div>
            </div>

            <button
              onClick={handleRollDice}
              disabled={isRolling || (match.turn !== (match.player1Id || 'player1') && !isLocal)}
              className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                skin === 'cyberpunk'
                ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-lg shadow-amber-500/20'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isRolling ? 'Rolando...' : 'Lançar Dados'}
            </button>
          </div>

          {/* Painel de Jogadores */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Jogadores e Saldos</h4>
            
            <div className="space-y-3">
              {players.map((player: any) => (
                <div key={player.id} className={`flex items-center justify-between p-3 rounded-2xl border ${
                  match.turn === player.id
                  ? (skin === 'cyberpunk' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-amber-500/10 border-amber-500/30')
                  : 'bg-black/20 border-white/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white uppercase ${
                      player.color === 'red' ? 'bg-red-500' : player.color === 'blue' ? 'bg-blue-500' : player.color === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}>
                      {player.name[0]}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                        {player.name} {player.isBot && <span className="text-[7px] text-gray-500 font-extrabold uppercase">(Bot)</span>}
                      </div>
                      <div className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Casa {player.position}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-black ${
                    skin === 'cyberpunk' ? 'text-purple-400' : 'text-amber-400'
                  }`}>M$ {player.money}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico/Log */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Log de Atividades</h4>
            
            <div className="h-28 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {log.map((line: string, idx: number) => (
                <p key={idx} className="text-[9px] text-gray-400 font-medium leading-relaxed border-l-2 border-white/10 pl-2">
                  {line}
                </p>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
