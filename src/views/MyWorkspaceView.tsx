import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { useNexusStore } from '../store/useNexusStore';
import { useDialog } from '../contexts/DialogContext';
import { toast } from 'sonner';
import { PremiumDialog } from '../components/PremiumDialog';
import { format, isToday } from 'date-fns';

// Interfaces importadas da Store
import type { PersonalLink, LinkFolder, PersonalGoal, NexusTask } from '../store/useNexusStore';

// Helper para ícones de sites comuns
const getUrlIcon = (url: string) => {
  const u = url.toLowerCase();
  if (u.includes('google')) return 'ph-google-logo';
  if (u.includes('figma')) return 'ph-figma-logo';
  if (u.includes('whatsapp')) return 'ph-whatsapp-logo';
  if (u.includes('github')) return 'ph-github-logo';
  if (u.includes('slack')) return 'ph-slack-logo';
  if (u.includes('notion')) return 'ph-notepad';
  if (u.includes('trello')) return 'ph-trello-logo';
  if (u.includes('facebook')) return 'ph-facebook-logo';
  if (u.includes('instagram')) return 'ph-instagram-logo';
  if (u.includes('linkedin')) return 'ph-linkedin-logo';
  if (u.includes('youtube')) return 'ph-youtube-logo';
  if (u.includes('spotify')) return 'ph-spotify-logo';
  if (u.includes('drive.google')) return 'ph-hard-drive';
  if (u.includes('meet.google')) return 'ph-video-camera';
  if (u.includes('zoom')) return 'ph-video-camera';
  return 'ph-link';
};

export default function MyWorkspaceView() {
  const { userProfile, user } = useAuth();
  const { teamProfiles, vacations, appointments, leads, clients } = useCRM();
  const { confirm, alert } = useDialog();
  
  // Zustand Store
  const folders = useNexusStore(state => state.folders);
  const links = useNexusStore(state => state.links);
  const goals = useNexusStore(state => state.goals);
  const tasks = useNexusStore(state => state.tasks);
  const notes = useNexusStore(state => state.notes);
  const loading = useNexusStore(state => state.loading);
  const initNexus = useNexusStore(state => state.init);
  const setFolders = useNexusStore(state => state.setFolders);
  const setLinks = useNexusStore(state => state.setLinks);
  const setGoals = useNexusStore(state => state.setGoals);
  const setTasks = useNexusStore(state => state.setTasks);
  const setNotes = useNexusStore(state => state.setNotes);

  const [activeTab, setActiveTab] = useState<'links' | 'goals' | 'notes' | 'tasks'>('links');
  const [dailyQuote, setDailyQuote] = useState<{content: string, author: string} | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Inicializa a Store
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = initNexus(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, initNexus]);

  // Modal States
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'folder' | 'link' | 'goal' | 'task';
    mode: 'add' | 'edit';
    data?: any;
  }>({ isOpen: false, type: 'folder', mode: 'add' });

  // Biblioteca interna de frases premium
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

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const seed = today.replace(/-/g, '') + user.uid.substring(0, 4);
    const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[index]);
  }, [user]);

  // HANDLERS: PASTAS
  const onConfirmFolder = (values: any) => {
    if (modalConfig.mode === 'add') {
      const newFolder: LinkFolder = {
        id: Date.now().toString(),
        label: values.label,
        icon: 'ph-folder-simple',
        color: 'primary'
      };
      setFolders([...folders, newFolder]);
    } else {
      setFolders(folders.map(f => f.id === modalConfig.data.id ? { ...f, label: values.label } : f));
    }
  };

  // HANDLERS: LINKS
  const onConfirmLink = (values: any) => {
    const url = values.url.startsWith('http') ? values.url : `https://${values.url}`;
    if (modalConfig.mode === 'add') {
      const newLink: PersonalLink = {
        id: Date.now().toString(),
        label: values.label,
        url,
        icon: getUrlIcon(url),
        folderId: selectedFolderId || (folders.length > 0 ? folders[0].id : undefined)
      };
      setLinks([...links, newLink]);
    } else {
      setLinks(links.map(l => l.id === modalConfig.data.id ? { ...l, label: values.label, url, icon: getUrlIcon(url) } : l));
    }
  };

  // HANDLERS: METAS
  const onConfirmGoal = (values: any) => {
    const target = parseInt(values.target) || 0;
    if (modalConfig.mode === 'add') {
      const newGoal: PersonalGoal = {
        id: Date.now().toString(),
        label: values.label,
        target,
        current: 0,
        unit: values.unit
      };
      setGoals([...goals, newGoal]);
    } else {
      setGoals(goals.map(g => g.id === modalConfig.data.id ? { ...g, label: values.label, target, unit: values.unit } : g));
    }
  };

  // HANDLERS: TASKS
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as any).taskInput;
    if (!input.value.trim()) return;
    const newTask: NexusTask = {
      id: Date.now().toString(),
      label: input.value,
      completed: false,
      createdAt: Date.now()
    };
    setTasks([...tasks, newTask]);
    input.value = '';
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleUpdateGoal = (id: string, increment: boolean) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        return { ...g, current: Math.max(0, increment ? g.current + 1 : g.current - 1) };
      }
      return g;
    }));
  };

  const handleDeleteGoal = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Meta',
      message: 'Tem certeza que deseja excluir esta meta? O progresso será perdido.',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Meta removida');
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Excluir Pasta',
      message: 'Deseja excluir esta pasta? Os links dentro dela não serão apagados, mas ficarão sem categoria.',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
      toast.success('Pasta removida');
    }
  };

  const handleDeleteLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await confirm({
      title: 'Excluir Link',
      message: 'Deseja remover este atalho do seu cofre?',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setLinks(links.filter(l => l.id !== id));
      toast.success('Link removido');
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  // Data: Agenda & Stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthDayStr = format(new Date(), 'MM-dd');

  const todayBirthdays = teamProfiles.filter(p => {
    if (!p.birthDate) return false;
    const bDate = p.birthDate.includes('/') ? p.birthDate.split('/').reverse().join('-') : p.birthDate;
    return bDate.endsWith(monthDayStr);
  });

  const todayAbsences = vacations.filter(v => v.status === 'Aprovado' && todayStr >= v.start && todayStr <= v.end);
  const todayAppointments = appointments.filter(a => isToday(new Date(a.startTime)) && a.status === 'approved');

  const myLeads = leads.filter(l => l.assignedTo === user?.uid && !['Convertido', 'Perdido'].includes(l.status || ''));
  const myOverdueClients = clients.filter(c => c.assignedTo === user?.uid && c.paymentStatus === 'OVERDUE');

  const filteredLinks = selectedFolderId 
    ? links.filter(l => l.folderId === selectedFolderId)
    : links;

  if (loading) return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Acessando Nexus...</span>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER DE BOAS VINDAS */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-white/5 pb-12">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400">Nexus Workspace v7.2.2</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Sync Ativo</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Hubber'}</span>.
            </h1>
            
            <div className="flex flex-wrap gap-4 mt-6">
              {/* Widget: Agenda do Dia */}
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl min-w-[240px] flex-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                  <i className="ph-bold ph-calendar text-primary-500" />
                  Agenda de Hoje
                </h4>
                <div className="space-y-2">
                  {todayBirthdays.length === 0 && todayAbsences.length === 0 && todayAppointments.length === 0 && (
                    <p className="text-xs text-gray-600 font-medium italic">Nenhum evento para hoje.</p>
                  )}
                  {todayBirthdays.map(p => (
                    <div key={p.uid} className="flex items-center gap-2 text-xs font-bold text-pink-400">
                      <span>🎂</span> Aniversário: {p.displayName.split(' ')[0]}
                    </div>
                  ))}
                  {todayAbsences.map(v => (
                    <div key={v.id} className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <span>🏖️</span> {v.type}: {teamProfiles.find(tp => tp.uid === v.userId)?.displayName.split(' ')[0]}
                    </div>
                  ))}
                  {todayAppointments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <span>🤝</span> {format(new Date(a.startTime), 'HH:mm')} - {a.meetingName}
                    </div>
                  ))}
                </div>
              </div>


              {/* Widget: Frase do Dia */}
              {dailyQuote && (
                <div className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl min-w-[300px] flex-[2]">
                   <i className="ph-duotone ph-quotes text-2xl text-primary-500/40" />
                   <p className="text-sm text-gray-300 italic font-medium leading-relaxed mt-1">"{dailyQuote.content}"</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-primary-500/60 mt-2">— {dailyQuote.author}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE TABS */}
        <nav className="flex bg-[#0a0c12]/40 backdrop-blur-2xl p-1.5 rounded-[2rem] border border-white/10 shadow-2xl h-fit">
          {[
            { id: 'links', label: 'Vault', icon: 'ph-link' },
            { id: 'goals', label: 'Metas', icon: 'ph-target' },
            { id: 'tasks', label: 'Tarefas', icon: 'ph-checks' },
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
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
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
                      Limpar
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
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black opacity-40 mr-2">{links.filter(l => l.folderId === folder.id).length}</span>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'folder', mode: 'edit', data: folder }); }} className="p-1.5 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple" /></button>
                          <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-1.5 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash" /></button>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'folder', mode: 'add' })} className="w-full p-4 border border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-white hover:border-primary-500/50 transition-all font-bold text-sm flex items-center justify-center gap-2">
                    <i className="ph-bold ph-plus" /> Nova Pasta
                  </button>
                </div>
              </div>

              {/* GRID DE LINKS */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
                    {selectedFolderId ? `Links em ${folders.find(f => f.id === selectedFolderId)?.label}` : 'Todos os Recursos'}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{filteredLinks.length} Itens</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredLinks.map(link => (
                    <div
                      key={link.id}
                      className="p-6 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] hover:border-primary-500/50 group transition-all relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-2 right-2 p-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={(e) => copyToClipboard(link.url, e)} className="p-1.5 bg-white/5 rounded-lg hover:bg-primary-500/20 hover:text-primary-400 transition-all" title="Copiar"><i className="ph-bold ph-copy text-sm" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'link', mode: 'edit', data: link }); }} className="p-1.5 bg-white/5 rounded-lg hover:bg-primary-500/20 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple text-sm" /></button>
                        <button onClick={(e) => handleDeleteLink(link.id, e)} className="p-1.5 bg-white/5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash text-sm" /></button>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 relative z-10 pr-24">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-primary-500/20">
                          <i className={`ph-duotone ${link.icon || getUrlIcon(link.url)} text-primary-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white group-hover:text-primary-400 transition-colors truncate">{link.label}</h4>
                          <p className="text-[10px] text-gray-500 font-mono mt-1 truncate">{link.url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</p>
                        </div>
                      </a>
                    </div>
                  ))}
                  <button onClick={() => setModalConfig({ isOpen: true, type: 'link', mode: 'add' })} className="p-6 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[104px]">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:rotate-90 transition-transform"><i className="ph-bold ph-plus" /></div>
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {goals.map(goal => {
                const percent = Math.min(100, (goal.current / goal.target) * 100);
                return (
                  <div key={goal.id} className="p-8 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl space-y-6 group relative">
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'edit', data: goal })} className="p-2 bg-white/5 rounded-xl hover:bg-primary-500/20 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple" /></button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 bg-white/5 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash" /></button>
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
                            <button onClick={() => handleUpdateGoal(goal.id, true)} className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary-500/40 transition-colors">+ Adicionar</button>
                            <button onClick={() => handleUpdateGoal(goal.id, false)} className="px-3 py-1 bg-white/5 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">- Reduzir</button>
                          </div>
                        </div>
                        <span className="text-sm font-black text-primary-400">{Math.round(percent)}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setModalConfig({ isOpen: true, type: 'goal', mode: 'add' })} className="p-8 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[220px]">
                <i className="ph-bold ph-plus-circle text-4xl group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">Criar Nova Meta</span>
              </button>
            </motion.section>
          )}

          {activeTab === 'tasks' && (
            <motion.section
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              {/* Personal Checklist */}
              <div className="p-10 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex flex-col min-h-[500px]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl text-primary-400">
                    <i className="ph-duotone ph-checks" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">Checklist de Tarefas</h3>
                </div>
                
                <form onSubmit={handleAddTask} className="flex gap-3 mb-10">
                  <input
                    name="taskInput"
                    placeholder="O que você precisa fazer hoje?"
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:border-primary-500/50 transition-all font-medium"
                  />
                  <button type="submit" className="w-14 h-14 bg-primary-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-primary-500/20 hover:scale-105 transition-all">
                    <i className="ph-bold ph-plus" />
                  </button>
                </form>

                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                  {tasks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 mt-10">
                       <i className="ph-duotone ph-clipboard-text text-6xl" />
                       <p className="text-sm font-bold uppercase tracking-widest">Nenhuma tarefa pendente</p>
                    </div>
                  )}
                  {tasks.sort((a,b) => (a.completed ? 1 : -1)).map(task => (
                    <div key={task.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${task.completed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => toggleTask(task.id)} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                          {task.completed && <i className="ph-bold ph-check text-xs" />}
                        </button>
                        <span className={`text-lg font-medium transition-all ${task.completed ? 'text-emerald-400/50 line-through' : 'text-gray-200'}`}>{task.label}</span>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-600 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash text-lg" /></button>
                    </div>
                  ))}
                </div>
              </div>
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
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Cloud Sync Ativo</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { const blob = new Blob([notes], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `notas-hub-${new Date().toISOString().split('T')[0]}.txt`; a.click(); }} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all" title="Exportar"><i className="ph-bold ph-export" /></button>
                    <button onClick={async () => { 
                      const ok = await confirm({ title: 'Limpar Notas', message: 'Deseja apagar todo o conteúdo das notas? Esta ação não pode ser desfeita.', variant: 'danger' });
                      if (ok) {
                        setNotes(''); 
                        toast.success('Notas limpas');
                      }
                    }} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-rose-400 transition-all" title="Limpar"><i className="ph-bold ph-trash" /></button>
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

      {/* DIÁLOGOS PREMIUM */}
      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'folder'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Nova Pasta' : 'Editar Pasta'}
        onConfirm={onConfirmFolder}
        fields={[{ id: 'label', label: 'Nome da Pasta', defaultValue: modalConfig.data?.label }]}
      />

      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'link'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Adicionar Link' : 'Editar Link'}
        onConfirm={onConfirmLink}
        fields={[
          { id: 'label', label: 'Título do Link', defaultValue: modalConfig.data?.label },
          { id: 'url', label: 'URL Completa', type: 'url', defaultValue: modalConfig.data?.url }
        ]}
      />

      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'goal'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Nova Meta' : 'Editar Meta'}
        onConfirm={onConfirmGoal}
        fields={[
          { id: 'label', label: 'Título da Meta', defaultValue: modalConfig.data?.label },
          { id: 'target', label: 'Valor Alvo', type: 'number', defaultValue: modalConfig.data?.target },
          { id: 'unit', label: 'Unidade (ex: leads)', defaultValue: modalConfig.data?.unit }
        ]}
      />

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
