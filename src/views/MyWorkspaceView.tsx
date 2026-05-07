import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumIcon } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';

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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
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
    const legacyLinks = userProfile?.myCorner?.links || [];
    const saved = localStorage.getItem('hub_workspace_links');
    if (saved) return JSON.parse(saved);
    
    if (legacyLinks.length > 0) {
      return legacyLinks.map((l: any, i: number) => ({
        id: `legacy-${i}-${Date.now()}`,
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

  // Handlers de Gerenciamento
  const handleAddFolder = () => {
    const label = prompt('Nome da nova pasta:');
    if (!label) return;
    const newFolder: LinkFolder = {
      id: Date.now().toString(),
      label,
      icon: 'ph-folder-simple',
      color: 'primary'
    };
    setFolders([...folders, newFolder]);
  };

  const handleAddLink = () => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
    const label = prompt('Título do link:');
    const url = prompt('URL completa (ex: https://...):');
    if (!label || !url) return;
    
    const newLink: PersonalLink = {
      id: Date.now().toString(),
      label,
      url: url.startsWith('http') ? url : `https://${url}`,
      icon: 'ph-link',
      folderId: selectedFolderId || folders[0]?.id
    };
    setLinks([...links, newLink]);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta pasta? Os links não serão excluídos, mas ficarão sem pasta.')) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    }
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir este link?')) {
      setLinks(links.filter(l => l.id !== id));
    }
  };

  const handleAddGoal = () => {
    const label = prompt('O que você quer alcançar? (ex: Leads Atendidos)');
    const target = prompt('Qual é o valor alvo? (ex: 50)');
    const unit = prompt('Qual a unidade? (ex: leads, vendas, posts)');
    if (!label || !target || !unit) return;

    const newGoal: PersonalGoal = {
      id: Date.now().toString(),
      label,
      target: parseInt(target),
      current: 0,
      unit
    };
    setGoals([...goals, newGoal]);
  };

  const handleUpdateGoal = (id: string, increment: boolean) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        return { ...g, current: Math.max(0, increment ? g.current + 1 : g.current - 1) };
      }
      return g;
    }));
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm('Deseja excluir esta meta?')) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  const filteredLinks = selectedFolderId 
    ? links.filter(l => l.folderId === selectedFolderId)
    : links;

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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Categorias</h3>
                  {selectedFolderId && (
                    <button 
                      onClick={() => setSelectedFolderId(null)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-white"
                    >
                      Limpar Filtro
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all group border ${
                        selectedFolderId === folder.id 
                        ? 'bg-primary-500/20 border-primary-500/40 text-white' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 border border-primary-500/30 group-hover:scale-110 transition-transform`}>
                          <i className={`ph-duotone ${folder.icon} text-xl`} />
                        </div>
                        <span className="font-bold group-hover:translate-x-1 transition-transform">{folder.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black opacity-40">{links.filter(l => l.folderId === folder.id).length}</span>
                        <button 
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:text-rose-400 transition-all"
                        >
                          <i className="ph-bold ph-trash" />
                        </button>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={handleAddFolder}
                    className="w-full p-4 border border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-white hover:border-primary-500/50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-plus" />
                    Nova Pasta
                  </button>
                </div>
              </div>

              {/* GRID DE LINKS */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                    {selectedFolderId ? `Links em ${folders.find(f => f.id === selectedFolderId)?.label}` : 'Todos os Recursos'}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{filteredLinks.length} Itens</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredLinks.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-6 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] hover:border-primary-500/50 group transition-all relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button 
                          onClick={(e) => copyToClipboard(link.url, e)}
                          className="p-2 bg-white/5 rounded-xl hover:bg-primary-500/20 hover:text-primary-400 transition-all"
                          title="Copiar Link"
                        >
                          <i className="ph-bold ph-copy" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteLink(link.id, e)}
                          className="p-2 bg-white/5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                          title="Excluir"
                        >
                          <i className="ph-bold ph-trash" />
                        </button>
                      </div>
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          <i className={`ph-duotone ${link.icon} text-primary-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white group-hover:text-primary-400 transition-colors truncate">{link.label}</h4>
                          <p className="text-[10px] text-gray-500 font-mono mt-1 truncate">{link.url.replace('https://', '')}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  <button 
                    onClick={handleAddLink}
                    className="p-6 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[104px]"
                  >
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
                  <div key={goal.id} className="p-8 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl space-y-6 group relative">
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 bg-white/5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                      >
                        <i className="ph-bold ph-trash" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-white tracking-tight">{goal.label}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Meta Individual</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl text-primary-400 border border-primary-500/30">
                        <i className="ph-duotone ph-chart-line-up" />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-3xl font-black text-white">{goal.current} <span className="text-sm text-gray-500">/ {goal.target} {goal.unit}</span></span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateGoal(goal.id, true)}
                              className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-500/40 transition-colors"
                            >
                              + Adicionar
                            </button>
                            <button 
                              onClick={() => handleUpdateGoal(goal.id, false)}
                              className="px-3 py-1 bg-white/5 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                            >
                              - Reduzir
                            </button>
                          </div>
                        </div>
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
              <button 
                onClick={handleAddGoal}
                className="p-8 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[220px]"
              >
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
                    <button 
                      onClick={() => {
                        const blob = new Blob([notes], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `notas-hub-${new Date().toISOString().split('T')[0]}.txt`;
                        a.click();
                      }}
                      className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                      title="Exportar Notas"
                    >
                      <i className="ph-bold ph-export" />
                    </button>
                    <button 
                      onClick={() => { if(confirm('Limpar todas as notas?')) setNotes(''); }}
                      className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-rose-400 transition-all"
                      title="Limpar"
                    >
                      <i className="ph-bold ph-trash" />
                    </button>
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
