import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  Cake, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Smile, 
  MessageSquare,
  Sparkles,
  ChevronRight,
  UserPlus,
  Plus,
  X,
  PlusCircle,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '../types';
import { format, differenceInYears, parseISO, isSameDay, addDays, isWithinInterval } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { VacationPeriod, PDICategory, PDIAction } from '../types/people';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'vacations';

export default function PeopleView() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const { vacations, teamProfiles, effectiveOrgId } = useCRM();
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    reason: 'Férias',
    status: 'Pendente',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

  // Novos estados para o PDI
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newActionText, setNewActionText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(
      collection(db, 'profiles'),
      where('orgId', '==', userProfile.orgId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setTeamMembers(members);
      setLoading(false);
      
      // Se tivermos um membro selecionado, atualizamos os dados dele a partir da lista
      if (selectedMember) {
        const updated = members.find(m => m.uid === selectedMember.uid);
        if (updated) setSelectedMember(updated);
      }
    });

    return () => unsubscribe();
  }, [userProfile?.orgId, selectedMember?.uid]);

  const celebratesAnniversary = (member: UserProfile) => {
    if (!member.startDate) return false;
    const start = parseISO(member.startDate);
    const today = new Date();
    return isSameDay(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      new Date(today.getFullYear(), start.getMonth(), start.getDate())
    );
  };

  const getTenure = (member: UserProfile) => {
    if (!member.startDate) return 'Data não definida';
    const years = differenceInYears(new Date(), parseISO(member.startDate));
    return years === 0 ? 'Menos de 1 ano' : `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  // --- LÓGICA DE ONBOARDING ---
  const toggleTask = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;

    // Criar o novo estado das tarefas de forma imutável
    const updatedTasks = member.onboardingTasks.map(t => {
      if (t.id === taskId) {
        const isNowCompleted = !t.completed;
        return { 
          ...t, 
          completed: isNowCompleted, 
          completedAt: isNowCompleted ? Date.now() : undefined 
        };
      }
      return t;
    });

    try {
      // Atualizar o Firestore
      const profileRef = doc(db, 'profiles', memberUid);
      await updateDoc(profileRef, {
        onboardingTasks: updatedTasks
      });
      
      toast.success('Tarefa atualizada!');
    } catch (error) {
      console.error('[Onboarding] Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const addTaskToOnboarding = async (memberUid: string, taskDescription: string) => {
    if (!taskDescription.trim()) return;
    try {
      const newTask: OnboardingTask = { id: Date.now().toString(), task: taskDescription, completed: false };
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: arrayUnion(newTask)
      });
      toast.success('Tarefa adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar tarefa.');
    }
  };

  const removeTaskFromOnboarding = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;
    const taskToRemove = member.onboardingTasks.find(t => t.id === taskId);
    if (!taskToRemove) return;

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: arrayRemove(taskToRemove)
      });
      toast.success('Tarefa removida!');
    } catch (error) {
      toast.error('Erro ao remover tarefa.');
    }
  };

  const assignDefaultTemplate = async (memberUid: string) => {
    const defaultTasks: OnboardingTask[] = [
      { id: '1', task: 'Configurar e-mail institucional', completed: false },
      { id: '2', task: 'Acesso ao Slack/Discord/WhatsApp da equipe', completed: false },
      { id: '3', task: 'Preencher dados no perfil do CRM', completed: false },
      { id: '4', task: 'Treinamento sobre o produto/serviço', completed: false },
      { id: '5', task: 'Assinar contrato de prestação de serviço', completed: false },
    ];

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: defaultTasks
      });
      toast.success('Checklist padrão atribuído!');
    } catch (error) {
      toast.error('Erro ao atribuir checklist.');
    }
  };

  // --- LÓGICA DE PDI (DESENVOLVIMENTO) ---
  const addPDICategory = async (memberUid: string) => {
    if (!newCategoryTitle.trim()) return;
    
    const member = teamMembers.find(m => m.uid === memberUid);
    const categories = member?.pdiCategories || [];
    
    const newCategory: PDICategory = {
      id: Date.now().toString(),
      title: newCategoryTitle,
      actions: []
    };

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        pdiCategories: [...categories, newCategory]
      });
      setNewCategoryTitle('');
      toast.success('Nova categoria adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar categoria.');
    }
  };

  const addPDIAction = async (memberUid: string, categoryId: string) => {
    const text = newActionText[categoryId];
    if (!text?.trim()) return;

    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;

    const updatedCategories = member.pdiCategories.map(cat => {
      if (cat.id === categoryId) {
        const newAction: PDIAction = {
          id: Date.now().toString(),
          description: text,
          completed: false
        };
        return { ...cat, actions: [...cat.actions, newAction] };
      }
      return cat;
    });

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        pdiCategories: updatedCategories
      });
      setNewActionText(prev => ({ ...prev, [categoryId]: '' }));
      toast.success('Ação adicionada ao PDI!');
    } catch (error) {
      toast.error('Erro ao adicionar ação.');
    }
  };

  const togglePDIAction = async (memberUid: string, categoryId: string, actionId: string) => {
    // Apenas gestores podem marcar como concluído
    if (userProfile?.role !== 'Administrador' && userProfile?.role !== 'Gerente' && userProfile?.role !== 'People & Culture') {
      toast.error('Apenas gestores podem validar o progresso do PDI.');
      return;
    }

    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;

    const updatedCategories = member.pdiCategories.map(cat => {
      if (cat.id === categoryId) {
        const updatedActions = cat.actions.map(act => 
          act.id === actionId ? { ...act, completed: !act.completed, completedAt: !act.completed ? Date.now() : undefined } : act
        );
        return { ...cat, actions: updatedActions };
      }
      return cat;
    });

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        pdiCategories: updatedCategories
      });
    } catch (error) {
      toast.error('Erro ao atualizar ação do PDI.');
    }
  };

  const removePDICategory = async (memberUid: string, categoryId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;

    const updatedCategories = member.pdiCategories.filter(cat => cat.id !== categoryId);

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        pdiCategories: updatedCategories
      });
      toast.success('Categoria removida.');
    } catch (error) {
      toast.error('Erro ao remover categoria.');
    }
  };

  // --- LÓGICA DE AUSÊNCIAS ---
  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacation.userId || !newVacation.start || !newVacation.end) {
      toast.error('Preencha todos os campos!');
      return;
    }

    try {
      const vRef = collection(db, 'organizations', effectiveOrgId, 'vacations');
      await setDoc(doc(vRef), {
        ...newVacation,
        id: Date.now().toString(),
        createdAt: Date.now()
      });
      setShowVacationModal(false);
      toast.success('Solicitação de ausência enviada!');
    } catch (error) {
      toast.error('Erro ao salvar ausência.');
    }
  };

  const updateVacationStatus = async (id: string, status: 'Aprovado' | 'Recusado') => {
    try {
      const vRef = doc(db, 'organizations', effectiveOrgId, 'vacations', id);
      await updateDoc(vRef, { status });
      toast.success(`Solicitação ${status.toLowerCase()}!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar status.');
    }
  };

  const deleteVacation = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const vRef = doc(db, 'organizations', effectiveOrgId, 'vacations', id);
      // Aqui usamos deleteDoc importado ou apenas um status pra esconder, mas vamos excluir de verdade
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(vRef);
      toast.success('Registro excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir registro.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartHandshake className="text-pink-500" /> People & Culture
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Desenvolvimento, bem-estar e cultura da equipe.</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-8 w-fit">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'dashboard' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'onboarding' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Sparkles size={18} />
            <span>Onboarding</span>
          </button>
          <button 
            onClick={() => setActiveTab('development')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'development' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Target size={18} />
            <span>Desenvolvimento</span>
          </button>
          <button 
            onClick={() => setActiveTab('vacations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'vacations' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Calendar size={18} />
            <span>Ausências</span>
          </button>
        </div>

        {/* Content Rendering */}
        <div className="relative">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center gap-2"><Smile className="text-yellow-500" /> Clima da Equipe</h3>
                  <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg">Mês Atual</span>
                </div>
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">--</div>
                  <div className="text-sm font-medium text-gray-500">Score eNPS (Aguardando Dados)</div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: '0%' }}></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4">Os dados serão atualizados assim que as pesquisas mensais forem respondidas.</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold flex items-center gap-2 mb-6"><Cake className="text-pink-500" /> Celebrações do Dia</h3>
                <div className="space-y-4">
                  {teamMembers.some(m => celebratesAnniversary(m)) ? (
                    teamMembers.filter(m => celebratesAnniversary(m)).map(m => (
                      <div key={m.uid} className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10 scale-in-center overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-2 transform rotate-12 opacity-10">
                           <Cake size={48} />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                            {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{m.displayName[0]}</div>}
                          </div>
                          <div>
                            <p className="font-bold">Aniversário de Empresa: {m.displayName}</p>
                            <p className="text-xs text-gray-500">Completando {getTenure(m)} conosco!</p>
                          </div>
                        </div>
                        <button className="bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold">Parabenizar</button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-50">
                      <p className="text-sm">Nenhuma celebração hoje.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Users className="text-blue-500" /> Talentos em Onboarding</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   {teamMembers.filter(m => (m.onboardingTasks?.length || 0) > 0).map(m => {
                     const completed = m.onboardingTasks?.filter(t => t.completed).length || 0;
                     const total = m.onboardingTasks?.length || 0;
                     const percent = Math.round((completed / total) * 100);
                     return (
                       <button 
                          key={m.uid} 
                          onClick={() => { setSelectedMember(m); setActiveTab('onboarding'); }}
                          className="p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary-500 transition-all text-left group"
                       >
                          <div className="flex items-center gap-3 mb-3">
                             <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                               {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]}
                             </div>
                             <div className="overflow-hidden">
                               <p className="text-xs font-bold truncate">{m.displayName}</p>
                               <p className="text-[10px] text-gray-500 truncate">{m.jobTitle}</p>
                             </div>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 transition-all" style={{ width: `${percent}%` }}></div>
                          </div>
                       </button>
                     );
                   })}
                 </div>
              </div>
            </div>
          )}

          {/* ONBOARDING TAB */}
          {activeTab === 'onboarding' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                   <Sparkles size={24} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold">Gestão de Onboarding</h2>
                   <p className="text-sm text-gray-500">Acompanhe a chegada dos novos talentos.</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 font-black">Equipe</p>
                     <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-1">
                        {teamMembers.map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-sm'}`}>
                            {m.displayName}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                       <div className="animate-in fade-in">
                          <h3 className="text-xl font-bold mb-6">{selectedMember.displayName}</h3>
                          {selectedMember.onboardingTasks ? (
                             <div className="space-y-2">
                                <div className="flex gap-2 mb-6">
                                   <input 
                                     id="new_onboarding_task"
                                     type="text" 
                                     placeholder="Nova tarefa de onboarding..." 
                                     className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-primary-500 transition-all"
                                     onKeyPress={e => e.key === 'Enter' && addTaskToOnboarding(selectedMember.uid, (e.target as HTMLInputElement).value)}
                                   />
                                   <button 
                                     onClick={() => {
                                       const input = document.getElementById('new_onboarding_task') as HTMLInputElement;
                                       addTaskToOnboarding(selectedMember.uid, input.value);
                                       input.value = '';
                                     }}
                                     className="p-3 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 shadow-lg shadow-primary-500/20 transition-all font-bold"
                                   >
                                     Adicionar
                                   </button>
                                </div>
                                <div className="space-y-2">
                                  {selectedMember.onboardingTasks.map(t => (
                                     <div key={t.id} className="flex items-center group/task gap-3 p-4 bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl transition-all">
                                        <div onClick={() => toggleTask(selectedMember.uid, t.id)} className="flex items-center flex-1 gap-3 cursor-pointer">
                                          {t.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-gray-300" />}
                                          <span className={t.completed ? 'line-through opacity-40' : 'font-medium'}>{t.task}</span>
                                        </div>
                                        <button onClick={() => removeTaskFromOnboarding(selectedMember.uid, t.id)} className="opacity-0 group-hover/task:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                          <Trash2 size={16} />
                                        </button>
                                     </div>
                                  ))}
                                </div>
                             </div>
                          ) : (
                             <div className="text-center py-20 bg-gray-100/50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                <p className="mb-4 text-gray-500">Nenhum checklist ativo.</p>
                                <button onClick={() => assignDefaultTemplate(selectedMember.uid)} className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg">Iniciar Checklist Padrão</button>
                             </div>
                          )}
                       </div>
                     ) : (
                       <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                          <Users size={40} className="mb-2 opacity-20" />
                          <p>Selecione alguém para começar</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {/* DEVELOPMENT (PDI) TAB */}
          {activeTab === 'development' && (
             <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Plano de Desenvolvimento (PDI)</h2>
                    <p className="text-sm text-gray-500">Árvore de competências e trilha de carreira.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Lista Lateral */}
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 font-black">Equipe</p>
                     <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-1">
                        {teamMembers.map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-sm'}`}>
                            {m.displayName}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Conteúdo do PDI */}
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                       <div className="animate-in fade-in">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold">PDI: {selectedMember.displayName}</h3>
                            <div className="flex gap-2">
                              <div className="relative group">
                                <input 
                                  type="text" 
                                  placeholder="Nova Categoria..." 
                                  className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary-500 w-40"
                                  value={newCategoryTitle}
                                  onChange={e => setNewCategoryTitle(e.target.value)}
                                  onKeyPress={e => e.key === 'Enter' && addPDICategory(selectedMember.uid)}
                                />
                                <button onClick={() => addPDICategory(selectedMember.uid)} className="absolute right-2 top-1.5 text-primary-500"><PlusCircle size={16} /></button>
                              </div>
                            </div>
                          </div>

                          {(selectedMember.pdiCategories || []).length > 0 ? (
                            <div className="space-y-6">
                               {selectedMember.pdiCategories!.map(cat => (
                                 <div key={cat.id} className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-6 relative group/cat">
                                    <div className="flex justify-between items-center mb-6">
                                       <h4 className="font-bold flex items-center gap-2"><ChevronDown size={18} className="text-indigo-500" /> {cat.title}</h4>
                                       <button onClick={() => removePDICategory(selectedMember.uid, cat.id)} className="opacity-0 group-hover/cat:opacity-100 p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                       {cat.actions.map(action => (
                                         <div key={action.id} className="flex items-center gap-3 p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group/act">
                                            <button 
                                              onClick={() => togglePDIAction(selectedMember.uid, cat.id, action.id)}
                                              className={`shrink-0 ${action.completed ? 'text-indigo-500' : 'text-gray-300 hover:text-indigo-400'} transition-all`}
                                            >
                                              {action.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${action.completed ? 'line-through text-gray-400' : 'font-medium'}`}>{action.description}</span>
                                            {action.completedAt && <span className="text-[10px] text-gray-400">{format(action.completedAt, 'dd/MM')}</span>}
                                         </div>
                                       ))}
                                    </div>

                                    <div className="flex gap-2">
                                       <input 
                                          type="text" 
                                          placeholder="Nova ação..." 
                                          className="flex-1 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-white/10 px-4 py-3 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-all"
                                          value={newActionText[cat.id] || ''}
                                          onChange={e => setNewActionText(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                          onKeyPress={e => e.key === 'Enter' && addPDIAction(selectedMember.uid, cat.id)}
                                       />
                                       <button 
                                          onClick={() => addPDIAction(selectedMember.uid, cat.id)}
                                          className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all"
                                       >
                                          <Plus size={18} />
                                       </button>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="text-center py-32 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[3rem] opacity-40">
                               <Target size={48} className="mx-auto mb-4" />
                               <p className="font-bold">Em construção...</p>
                               <p className="text-sm">Crie a primeira categoria acima para iniciar o PDI.</p>
                            </div>
                          )}
                       </div>
                     ) : (
                       <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                          <Target size={40} className="mb-2 opacity-20" />
                          <p>Selecione alguém para gerir o desenvolvimento</p>
                       </div>
                     )}
                  </div>
                </div>
             </div>
          )}

          {/* VACATIONS TAB */}
          {activeTab === 'vacations' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                     <Calendar size={24} />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold">Gestão de Ausências</h2>
                     <p className="text-sm text-gray-500">Férias e pedidos pendentes.</p>
                   </div>
                 </div>
                 <button onClick={() => setShowVacationModal(true)} className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                   <Plus size={18} /> Novo Pedido
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vacations.map(v => {
                     const user = teamProfiles.find(p => p.uid === v.userId);
                     return (
                      <div key={v.id} className="p-6 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm relative group/vac">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                              <span className={`text-[10px] uppercase font-black ${v.reason === 'Motivo Médico' ? 'text-red-500' : v.reason === 'Falta' ? 'text-amber-500' : 'text-gray-400'}`}>
                                {v.reason || v.type}
                              </span>
                              {v.reason && v.reason !== v.type && <span className="text-[9px] text-gray-400">{v.type}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${v.status === 'Aprovado' || v.status === 'Informado' ? 'bg-emerald-500/10 text-emerald-500' : v.status === 'Recusado' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                 {v.status}
                              </span>
                              {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
                                <button onClick={() => deleteVacation(v.id)} className="opacity-0 group-hover/vac:opacity-100 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Excluir Registro">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                         </div>
                         <p className="font-bold text-sm mb-4">{user?.displayName || 'Membro'}</p>
                         <div className="flex items-center justify-between text-xs py-3 border-t border-gray-100 dark:border-white/5">
                            <div><span className="text-[10px] text-gray-400 block uppercase font-bold">Início</span>{v.start}</div>
                            <div><span className="text-[10px] text-gray-400 block text-right uppercase font-bold">Retorno</span>{v.end}</div>
                         </div>
                         {v.status === 'Pendente' && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
                           <div className="mt-4 flex gap-2">
                              <button onClick={() => updateVacationStatus(v.id, 'Aprovado')} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors">Aprovar</button>
                              <button onClick={() => updateVacationStatus(v.id, 'Recusado')} className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors">Recusar</button>
                           </div>
                         )}
                      </div>
                     );
                  })}
               </div>
            </div>
          )}
        </div>

        {/* Modal de Nova Ausência */}
        {showVacationModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowVacationModal(false)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                 <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-2xl font-bold">Nova Solicitação</h3>
                    <button onClick={() => setShowVacationModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
                 </div>
                 <form onSubmit={handleAddVacation} className="p-8 space-y-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Colaborador</label>
                       <select required className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium" value={newVacation.userId || ''} onChange={e => setNewVacation({...newVacation, userId: e.target.value})}>
                          <option value="">Selecione...</option>
                          {teamProfiles.map(p => (<option key={p.uid} value={p.uid}>{p.displayName}</option>))}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo / Motivo</label>
                          <select 
                            required 
                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium" 
                            value={newVacation.reason || ''} 
                            onChange={e => {
                              const reason = e.target.value as any;
                              // Auto-aprovado se for falta ou médico (Informado)
                              const status = (reason === 'Falta' || reason === 'Motivo Médico') ? 'Informado' : 'Pendente';
                              // Mapear reason para type (Férias vs Ausência)
                              const type = reason === 'Férias' ? 'Férias' : 'Ausência';
                              setNewVacation({...newVacation, reason, status, type});
                            }}
                          >
                             <option value="">Selecione...</option>
                             <option value="Férias">Férias</option>
                             <option value="Falta">Falta</option>
                             <option value="Motivo Médico">Motivo Médico</option>
                             <option value="Licença Maternidade/Paternidade">Licença</option>
                             <option value="Outro">Outro Motivo</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Início</label>
                          <input type="date" required className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all" value={newVacation.start} onChange={e => setNewVacation({...newVacation, start: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Fim</label>
                          <input type="date" required className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all" value={newVacation.end} onChange={e => setNewVacation({...newVacation, end: e.target.value})} />
                       </div>
                    </div>
                    <button type="submit" className="w-full bg-primary-500 hover:bg-primary-600 text-white p-5 rounded-2xl font-bold shadow-xl shadow-primary-500/20 transition-all">Enviar Solicitação</button>
                 </form>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
