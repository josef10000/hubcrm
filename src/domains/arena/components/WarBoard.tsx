import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Swords, RefreshCw, LogOut } from 'lucide-react';
import { GameMatch, useArenaStore } from '@store/useArenaStore';

interface WarBoardProps {
  match: any;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function WarBoard({ match, isLocal, aiDifficulty, onExit }: WarBoardProps) {
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  const [skin, setSkin] = useState<'classic' | 'cyberpunk'>('classic');
  const [battleDice, setBattleDice] = useState<{ atk: number[]; def: number[] } | null>(null);
  const [isFighting, setIsFighting] = useState(false);

  const players = match.boardState?.players || [];
  const territories = match.boardState?.territories || {};
  const objectives = match.boardState?.playerObjectives || {};
  const currentPhase = match.boardState?.phase || 'distribute';

  const handleSimulateAttack = () => {
    if (isFighting) return;
    setIsFighting(true);

    // Simula a rolagem de dados clássica (Atacante rola 3, Defensor rola 3)
    setTimeout(() => {
      const atkRolls = Array(3).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
      const defRolls = Array(3).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

      setBattleDice({ atk: atkRolls, def: defRolls });
      setIsFighting(false);

      if (match.boardState) {
        const nextState = { ...match.boardState };
        // Lógica de ataque: Exemplo de modificação no território
        // Mudar o exército do brasil como exemplo
        if (nextState.territories['brasil']) {
          const armies = nextState.territories['brasil'].armies;
          nextState.territories['brasil'].armies = Math.max(1, armies - 1);
        }
        makeMove(nextState, `${match.player1Name} simulou ataque.`);
      }
    }, 1000);
  };

  const handleToggleSkin = () => {
    setSkin(prev => prev === 'classic' ? 'cyberpunk' : 'classic');
  };

  return (
    <div className={`w-full min-h-[calc(100vh-140px)] rounded-[2.5rem] p-6 transition-all duration-500 border ${
      skin === 'cyberpunk'
      ? 'bg-slate-950/80 border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-white'
      : 'bg-gradient-to-br from-amber-950/15 to-stone-900/40 border-amber-500/20 text-stone-200'
    }`}>
      {/* Header do Jogo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-500/15 rounded-2xl">
            <span className="text-2xl">🪖</span>
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest">WAR MULTIPLAYER</h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              Modo: {isLocal ? 'Singleplayer' : 'Multiplayer'} | Skin ativa:{' '}
              <span className={skin === 'cyberpunk' ? 'text-cyan-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                {skin.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleToggleSkin}
            className={`px-4 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              skin === 'cyberpunk'
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
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
        {/* Lado Esquerdo: Mapa SVG (Esboço do mapa múndi ou representação tática interativa) */}
        <div className="lg:col-span-2 flex items-center justify-center p-4 bg-black/30 border border-white/5 rounded-3xl min-h-[450px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-4xl animate-pulse">🗺️</div>
            <h3 className="text-base font-black uppercase tracking-wider">Mapa do War em Construção</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              O mapa-múndi tático e responsivo com caminhos interativos em SVG e divisão de 6 continentes oficiais está planejado na Fase 3 do checklist. Use o painel lateral para ver a simulação de batalha de dados e os exércitos distribuídos!
            </p>
            <div className="flex justify-center gap-4 py-2">
              <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold">42 Territórios Mapeados</span>
              <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold">Objetivos Secretos Sorteados</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Jogadores, Dados & Objetivos */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Objetivo Secreto do Jogador Principal */}
          <div className={`p-6 border rounded-3xl space-y-3 ${
            skin === 'cyberpunk'
            ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
          }`}>
            <h4 className="text-[10px] font-black uppercase tracking-widest">Seu Objetivo Secreto</h4>
            <p className="text-xs font-semibold leading-relaxed">
              {objectives[match.player1Id] || 'Conquistar 24 territórios à sua escolha no mapa mundial.'}
            </p>
          </div>

          {/* Simulador de Batalha (Dados de Ataque vs Defesa) */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-4 text-center">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider w-full text-left">Simulador de Combate Tático</h4>
            
            <div className="grid grid-cols-2 gap-8 w-full">
              {/* Dados Ataque (Vermelhos) */}
              <div className="space-y-2">
                <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Ataque</span>
                <div className="flex justify-center gap-2">
                  {battleDice ? battleDice.atk.map((val, i) => (
                    <div key={i} className="w-8 h-8 bg-red-600 border border-red-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                      {val}
                    </div>
                  )) : Array(3).fill('?').map((v, i) => (
                    <div key={i} className="w-8 h-8 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center justify-center font-bold text-sm text-gray-600">
                      ?
                    </div>
                  ))}
                </div>
              </div>

              {/* Dados Defesa (Amarelos) */}
              <div className="space-y-2">
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Defesa</span>
                <div className="flex justify-center gap-2">
                  {battleDice ? battleDice.def.map((val, i) => (
                    <div key={i} className="w-8 h-8 bg-amber-600 border border-amber-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                      {val}
                    </div>
                  )) : Array(3).fill('?').map((v, i) => (
                    <div key={i} className="w-8 h-8 bg-amber-950/20 border border-amber-900/30 rounded-lg flex items-center justify-center font-bold text-sm text-gray-600">
                      ?
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulateAttack}
              disabled={isFighting || (match.turn !== (match.player1Id || 'player1') && !isLocal)}
              className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                skin === 'cyberpunk'
                ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-lg shadow-amber-500/20'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isFighting ? 'Combate Ativo...' : 'Simular Lançamento / Atacar'}
            </button>
          </div>

          {/* Jogadores & Força Militar */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Generais da Partida</h4>
            
            <div className="space-y-3">
              {players.map((player: any) => (
                <div key={player.id} className={`flex items-center justify-between p-3 rounded-2xl border ${
                  match.turn === player.id
                  ? (skin === 'cyberpunk' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-amber-500/10 border-amber-500/30')
                  : 'bg-black/20 border-white/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white uppercase ${
                      player.color === 'red' ? 'bg-red-500' : player.color === 'blue' ? 'bg-blue-500' : player.color === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}>
                      {player.color[0]}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                        {player.name || player.id} {player.isBot && <span className="text-[7px] text-gray-500 font-extrabold uppercase">(Bot)</span>}
                      </div>
                      <div className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Fase de Jogo: {currentPhase.toUpperCase()}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    skin === 'cyberpunk' ? 'text-cyan-400' : 'text-amber-400'
                  }`}>Brasil: {territories['brasil']?.armies || 3} ex.</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
