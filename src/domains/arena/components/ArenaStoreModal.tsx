import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Coins, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore } from '@/store/useArenaStore';
import { toast } from 'sonner';

interface ArenaStoreModalProps {
  onClose: () => void;
}

const COSMETICS_LIST = {
  frames: [
    { id: 'neon', name: 'Neon Purple', cost: 150, desc: 'Brilho roxo vibrante futurista', color: 'from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' },
    { id: 'gold', name: 'Gold Premium', cost: 300, desc: 'Gradiente de ouro para líderes', color: 'from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
    { id: 'cyberpunk', name: 'Cyberpunk Cyan', cost: 250, desc: 'Estética clássica de neon holográfico', color: 'from-cyan-400 to-pink-500 shadow-[0_0_15px_rgba(0,243,255,0.6)]' },
    { id: 'floral', name: 'Eco Floral', cost: 100, desc: 'Folhagens e tons verdes relaxantes', color: 'from-emerald-300 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
    { id: 'ruby', name: 'Ruby Red', cost: 200, desc: 'Vermelho intenso rubi lapidado', color: 'from-red-500 to-rose-700 shadow-[0_0_12px_rgba(225,29,72,0.5)]' },
    { id: 'ocean', name: 'Ocean Blue', cost: 120, desc: 'Azul refrescante do oceano profundo', color: 'from-blue-400 to-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.5)]' },
    { id: 'dark', name: 'Dark Minimalist', cost: 80, desc: 'Borda preta discreta e elegante', color: 'from-gray-800 to-black shadow-[0_0_10px_rgba(255,255,255,0.1)]' },
    { id: 'rainbow', name: 'Rainbow Glow', cost: 500, desc: 'Arco-íris animado pulsante ultra-raro', color: 'from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse' },
    { id: 'silver', name: 'Silver Platinum', cost: 180, desc: 'Prata polida clássica e refinada', color: 'from-gray-300 via-gray-100 to-gray-400 shadow-[0_0_10px_rgba(209,213,219,0.6)]' }
  ],
  titles: [
    { id: 'Lenda da Arena', cost: 200, desc: 'Exibe o título de maior prestígio dos tabuleiros', style: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 font-extrabold shadow-sm' },
    { id: 'Grão-Mestre', cost: 350, desc: 'O título definitivo dos jogadores de Xadrez', style: 'text-yellow-400 font-black tracking-wider animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.3)]' },
    { id: 'Predador de Damas', cost: 180, desc: 'Para quem faz capturas múltiplas incríveis', style: 'text-red-500 font-extrabold uppercase tracking-tight' },
    { id: 'Imbatível', cost: 150, desc: 'Para quem sustenta vitórias online consecutivas', style: 'text-cyan-400 font-bold border border-cyan-400/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest' },
    { id: 'Estrategista', cost: 100, desc: 'Mente analítica e tática silenciosa', style: 'text-slate-400 font-semibold italic' }
  ]
};

export function ArenaStoreModal({ onClose }: ArenaStoreModalProps) {
  const { userProfile } = useAuth();
  const { purchaseCosmetic, equipCosmetic } = useArenaStore();
  const [activeTab, setActiveTab] = useState<'frames' | 'titles'>('frames');
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const credits = userProfile?.arenaCredits || 0;
  const unlockedFrames = userProfile?.unlockedFrames || ['none'];
  const unlockedTitles = userProfile?.unlockedTitles || [];
  const activeFrame = userProfile?.avatarFrame || 'none';
  const activeTitle = userProfile?.activeTitle || '';

  const playSound = (type: 'success' | 'click' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.setValueAtTime(392.00, now + 0.1); // G4
        osc.frequency.setValueAtTime(523.25, now + 0.2); // C5
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.warn('Som procedural indisponível:', e);
    }
  };

  const handleBuy = async (id: string, cost: number, type: 'frame' | 'title') => {
    if (!userProfile?.uid) return;
    playSound('click');
    setLoadingItem(id);
    try {
      await purchaseCosmetic(userProfile.uid, id, type, cost);
      playSound('success');
      toast.success('Desbloqueado com sucesso! Já pode equipar.');
    } catch (err: any) {
      playSound('error');
      toast.error(err.message || 'Erro ao realizar a compra.');
    } finally {
      setLoadingItem(null);
    }
  };

  const handleEquip = async (id: string, type: 'frame' | 'title') => {
    if (!userProfile?.uid) return;
    playSound('click');
    setLoadingItem(id);
    try {
      await equipCosmetic(userProfile.uid, id, type);
      toast.success(type === 'frame' ? 'Moldura equipada!' : 'Título equipado!');
    } catch (err) {
      toast.error('Erro ao equipar item.');
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none"
    >
      <motion.div
        initial={{ scale: 0.93, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 15 }}
        className="w-full max-w-2xl rounded-[2.5rem] border bg-slate-950/90 border-purple-500/20 text-white p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(168,85,247,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar relative"
      >
        {/* Neon Glow Superior */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[90px] -mr-16 -mt-16 bg-purple-500 opacity-20 pointer-events-none" />

        {/* Header da Loja */}
        <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest leading-none flex items-center gap-2">
                Loja da Arena
                <Sparkles size={16} className="text-yellow-400 animate-pulse" />
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Cosméticos retrô arcade e títulos exclusivos</p>
            </div>
          </div>

          {/* Saldo de Moedas */}
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
            <Coins size={16} className="text-yellow-400 animate-bounce" />
            <span className="text-sm font-black text-yellow-400 tracking-wider">{credits}</span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Coins</span>
          </div>

          <button
            onClick={() => { playSound('click'); onClose(); }}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas e Seletores */}
        <div className="flex gap-2 relative z-10">
          <button
            onClick={() => { playSound('click'); setActiveTab('frames'); }}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'frames'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 border border-purple-400/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Molduras de Avatar
          </button>
          <button
            onClick={() => { playSound('click'); setActiveTab('titles'); }}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'titles'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 border border-purple-400/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Títulos de Chat
          </button>
        </div>

        {/* Corpo com Grid de Itens */}
        <div className="relative z-10 flex-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'frames' ? (
              <motion.div
                key="frames"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {COSMETICS_LIST.frames.map((item) => {
                  const isUnlocked = unlockedFrames.includes(item.id);
                  const isActive = activeFrame === item.id;
                  const canAfford = credits >= item.cost;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-[2rem] flex flex-col justify-between h-48 bg-slate-950/40 relative overflow-hidden group transition-all ${
                        isActive
                        ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)] bg-purple-500/5'
                        : 'border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                      }`}
                    >
                      {/* Efeito Visual do Frame */}
                      <div className="flex items-center justify-between">
                        <div className={`w-14 h-14 rounded-full p-[3px] ${item.color}`}>
                          <div className="bg-slate-900 rounded-full w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            AVATAR
                          </div>
                        </div>
                        {isUnlocked ? (
                          <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={8} /> Adquirido
                          </span>
                        ) : (
                          <span className="text-[8px] font-black bg-slate-800 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Lock size={8} /> Bloqueado
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-3">
                        <h4 className="text-xs font-black uppercase tracking-wider leading-none text-white">{item.name}</h4>
                        <p className="text-[8px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">{item.desc}</p>
                      </div>

                      {/* Ação Botão */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        {!isUnlocked ? (
                          <button
                            onClick={() => handleBuy(item.id, item.cost, 'frame')}
                            disabled={!canAfford || loadingItem !== null}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                              canAfford
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold'
                              : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                            }`}
                          >
                            <Coins size={10} />
                            Comprar por {item.cost} Coins
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(isActive ? 'none' : item.id, 'frame')}
                            disabled={loadingItem !== null}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer transition-colors ${
                              isActive
                              ? 'bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-400 border border-white/5'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold'
                            }`}
                          >
                            {isActive ? 'Remover Borda ✕' : 'Equipar Moldura'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="titles"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {COSMETICS_LIST.titles.map((item) => {
                  const isUnlocked = unlockedTitles.includes(item.id);
                  const isActive = activeTitle === item.id;
                  const canAfford = credits >= item.cost;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-[2rem] flex flex-col justify-between h-48 bg-slate-950/40 relative overflow-hidden group transition-all ${
                        isActive
                        ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)] bg-purple-500/5'
                        : 'border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                      }`}
                    >
                      {/* Demonstração do Título */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Visualização</span>
                          <span className={`text-[11px] uppercase tracking-wider ${item.style}`}>
                            {item.id}
                          </span>
                        </div>
                        {isUnlocked ? (
                          <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={8} /> Adquirido
                          </span>
                        ) : (
                          <span className="text-[8px] font-black bg-slate-800 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Lock size={8} /> Bloqueado
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-3">
                        <h4 className="text-xs font-black uppercase tracking-wider leading-none text-white">{item.id}</h4>
                        <p className="text-[8px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">{item.desc}</p>
                      </div>

                      {/* Ação Botão */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        {!isUnlocked ? (
                          <button
                            onClick={() => handleBuy(item.id, item.cost, 'title')}
                            disabled={!canAfford || loadingItem !== null}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                              canAfford
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold'
                              : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                            }`}
                          >
                            <Coins size={10} />
                            Comprar por {item.cost} Coins
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(isActive ? '' : item.id, 'title')}
                            disabled={loadingItem !== null}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-center cursor-pointer transition-colors ${
                              isActive
                              ? 'bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-400 border border-white/5'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold'
                            }`}
                          >
                            {isActive ? 'Remover Título ✕' : 'Equipar Título'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
