import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumIcon } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

interface PersonalLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  folderId?: string;
}

interface LinkFolder {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface PersonalGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export default function MyWorkspaceView() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'links' | 'goals' | 'notes'>('links');
  const [dailyQuote, setDailyQuote] = useState<{content: string, author: string} | null>(null);
  
  // Biblioteca interna de frases premium (Fallback)
  const MOTIVATIONAL_QUOTES = [
    { content: "O sucesso não é o final, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Winston Churchill" },
    { content: "Acredite que você pode e você estará no meio do caminho.", author: "Theodore Roosevelt" },
    { content: "Trabalhe duro em silêncio, deixe seu sucesso ser seu barulho.", author: "Frank Ocean" },
    { content: "Sonhe alto. Comece pequeno. Mas, acima de tudo, comece.", author: "Simon Sinek" },
    { content: "Não espere por oportunidades. Crie-as.", author: "Autor Desconhecido" },
    { content: "Sua única competição é quem você era ontem.", author: "Autor Desconhecido" },
    { content: "O melhor momento para plantar uma árvore foi há 20 anos. O segundo melhor é agora.", author: "Provérbio Chinês" },
    { content: "O que você faz hoje pode melhorar todos os seus amanhãs.", author: "Ralph Marston" }
  ];

  // Lógica de Frase do Dia (Determinística)
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const seed = today.replace(/-/g, '') + user.uid.substring(0, 4);
    const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[index]);
  }, [user]);

  // States para Dados (Sincronizados com Perfil + LocalStorage)
  const [folders, setFolders] = useState<LinkFolder[]>(() => {
    const saved = localStorage.getItem('hub_workspace_folders');
    return saved ? JSON.parse(saved) : [
      { id: '1', label: 'Recursos Diários', icon: 'ph-star', color: 'amber' },
      { id: '2', label: 'Ferramentas de Vendas', icon: 'ph-funnel', color: 'primary' },
      { id: '3', label: 'Referências Wiki', icon: 'ph-book-open', color: 'emerald' }
    ];
  });

  const [links, setLinks] = useState<PersonalLink[]>(() => {
    // Tenta migrar do My Corner se existir
    const legacyLinks = userProfile?.myCorner?.links || [];
    const saved = localStorage.getItem('hub_workspace_links');
    if (saved) return JSON.parse(saved);
    
    if (legacyLinks.length > 0) {
      return legacyLinks.map((l: any, i: number) => ({
        id: `legacy-${i}`,
        label: l.title,
        url: l.url,
        icon: 'ph-link',
        folderId: '1'
      }));
    }

    return [
      { id: '1', label: 'Dashboard Hub', url: '#', icon: 'ph-monitor', folderId: '1' },
      { id: '2', label: 'Figma Design', url: '#', icon: 'ph-figma-logo', folderId: '1' }
    ];
  });

  const [goals, setGoals] = useState<PersonalGoal[]>(() => {
    const saved = localStorage.getItem('hub_workspace_goals');
    return saved ? JSON.parse(saved) : [
      { id: '1', label: 'Leads Atendidos', current: 0, target: 20, unit: 'leads' },
      { id: '2', label: 'Artigos Wiki Criados', current: 0, target: 5, unit: 'artigos' }
    ];
  });

  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('hub_workspace_notes') || userProfile?.myCorner?.notes || '';
  });

  // Efeitos de Persistência
  useEffect(() => localStorage.setItem('hub_workspace_folders', JSON.stringify(folders)), [folders]);
  useEffect(() => localStorage.setItem('hub_workspace_links', JSON.stringify(links)), [links]);
  useEffect(() => localStorage.setItem('hub_workspace_goals', JSON.stringify(goals)), [goals]);
  useEffect(() => localStorage.setItem('hub_workspace_notes', notes), [notes]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER DE BOAS VINDAS */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-white/5 pb-12">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400">Nexus Workspace v7.0</span>
            </div>
            <span className="text-gray-600 font-mono text-xs">// Private Node</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Hubber'}</span>.
            </h1>
            
            {dailyQuote && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-4 max-w-2xl mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-3xl"
              >
                <i className="ph-duotone ph-quotes text-3xl text-primary-500/40 mt-1" />
                <div className="space-y-1">
                  <p className="text-gray-300 italic font-medium leading-relaxed">"{dailyQuote.content}"</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-500/60">— {dailyQuote.author}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE TABS (GLASS) */}
        <nav className="flex bg-[#0a0c12]/40 backdrop-blur-2xl p-1.5 rounded-[2rem] border border-white/10 shadow-2xl h-fit">
          {[
            { id: 'links', label: 'Vault', icon: 'ph-link' },
            { id: 'goals', label: 'Metas', icon: 'ph-target' },
            { id: 'notes', label: 'Notas', icon: 'ph-note-pencil' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-primary-500 text-white shadow-lg' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`ph-duotone ${tab.icon} text-lg`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'links' && (
            <motion.section
              key="links"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* LISTA DE PASTAS */}
              <div className="lg:col-span-1 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-6">Categorias</h3>
                <div className="space-y-3">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl bg-${folder.color}-500/20 flex items-center justify-center text-${folder.color}-400 border border-${folder.color}-500/30`}>
                          <i className={`ph-duotone ${folder.icon} text-xl`} />
                        </div>
                        <span className="font-bold text-white group-hover:translate-x-1 transition-transform">{folder.label}</span>
                      </div>
                      <i className="ph-bold ph-caret-right text-gray-600 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                  <button className="w-full p-4 border border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-white hover:border-primary-500/50 transition-all font-bold text-sm flex items-center justify-center gap-2">
                    <i className="ph-bold ph-plus" />
                    Nova Pasta
                  </button>
                </div>
              </div>

              {/* GRID DE LINKS */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Recursos Salvos</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300">Ver Todos</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {links.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      className="p-6 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] hover:border-primary-500/50 group transition-all relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ph-bold ph-arrow-square-out text-primary-400" />
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          <i className={`ph-duotone ${link.icon} text-primary-400`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white group-hover:text-primary-400 transition-colors">{link.label}</h4>
                          <p className="text-[10px] text-gray-500 font-mono mt-1">{link.url.replace('https://', '')}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  <button className="p-6 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:rotate-90 transition-transform">
                      <i className="ph-bold ph-plus" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Adicionar Link</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'goals' && (
            <motion.section
              key="goals"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {goals.map(goal => {
                const percent = Math.min(100, (goal.current / goal.target) * 100);
                return (
                  <div key={goal.id} className="p-8 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white tracking-tight">{goal.label}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Meta Individual</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl text-primary-400 border border-primary-500/30">
                        <i className="ph-duotone ph-chart-line-up" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-3xl font-black text-white">{goal.current} <span className="text-sm text-gray-500">/ {goal.target} {goal.unit}</span></span>
                        <span className="text-sm font-black text-primary-400">{Math.round(percent)}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="p-8 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group">
                <i className="ph-bold ph-plus-circle text-4xl group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">Criar Nova Meta</span>
              </button>
            </motion.section>
          )}

          {activeTab === 'notes' && (
            <motion.section
              key="notes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <div className="bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-1 shadow-2xl h-full flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Sync Ativo</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="text-gray-500 hover:text-white transition-colors"><i className="ph-bold ph-export" /></button>
                    <button className="text-gray-500 hover:text-white transition-colors"><i className="ph-bold ph-trash" /></button>
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Comece a escrever suas ideias aqui..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 p-8 text-lg font-medium resize-none custom-scrollbar"
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER DO WORKSPACE */}
      <footer className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
        <div className="flex items-center gap-4">
          <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Central" className="h-6 grayscale" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Security: End-to-End Encrypted</span>
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-600">
          Last Sync: {new Date().toLocaleTimeString()}
        </div>
      </footer>
    </div>
  );
}
