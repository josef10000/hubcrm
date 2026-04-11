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
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '../types';
import { format, differenceInYears, parseISO, isSameDay, addDays, isWithinInterval } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { VacationPeriod } from '../types/people';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'vacations';

export default function PeopleView() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
    });

    return () => unsubscribe();
  }, [userProfile?.orgId]);

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

  const toggleTask = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;

    const newTasks = member.onboardingTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t
    );

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: newTasks
      });
      toast.success('Tarefa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
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

  const { vacations, teamProfiles, effectiveOrgId } = useCRM();
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    status: 'Pendente',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

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
      toast.error('Erro ao atualizar status.');
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
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Clima Organizacional (eNPS Mock) */}
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2"><Smile className="text-yellow-500" /> Clima da Equipe</h3>
                <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg">Mês Atual</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">78</div>
                <div className="text-sm font-medium text-gray-500">Score eNPS (Excelente)</div>
                <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>

            {/* Celebrações */}
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
                        <div className="w-12 h-12 rounded-full bg-primary-500 p-0.5">
                          {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-white">{m.displayName[0]}</div>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">Aniversário de Empresa: {m.displayName}</p>
                          <p className="text-sm text-gray-500">Completando {getTenure(m)} de jornada conosco!</p>
                        </div>
                      </div>
                      <button className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20">Parabenizar</button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500 text-sm">Nenhuma celebração para hoje. Que tal planejar o próximo Happy Hour?</p>
                  </div>
                )}
              </div>
            </div>

            {/* Talentos Recentes (Onboarding Stats) */}
            <div className="md:col-span-3 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
               <h3 className="font-bold flex items-center gap-2 mb-6"><Users className="text-blue-500" /> Talentos em Onboarding</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 {teamMembers.filter(m => (m.onboardingTasks?.length || 0) > 0).slice(0, 4).map(m => {
                   const completed = m.onboardingTasks?.filter(t => t.completed).length || 0;
                   const total = m.onboardingTasks?.length || 0;
                   const percent = Math.round((completed / total) * 100);
                   return (
                     <div key={m.uid} className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:border-primary-500/30 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                             {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]}
                           </div>
                           <div className="flex-1">
                             <p className="text-xs font-bold truncate">{m.displayName}</p>
                             <p className="text-[10px] text-gray-500">{m.jobTitle}</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                           <span className="font-bold">{percent}%</span>
                           <span className="text-gray-500">{completed}/{total} tarefas</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all" style={{ width: `${percent}%` }}></div>
                        </div>
                     </div>
                   );
                 })}
                 <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:bg-white/5 transition-all text-gray-400 text-sm cursor-pointer lg:flex hidden">
                    <UserPlus size={20} className="mr-2" /> Novo Membro
                 </div>
               </div>
            </div>
          </div>
        )}

          <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
             <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                 <Sparkles size={24} />
               </div>
               <div>
                 <h2 className="text-xl font-bold">Gestão de Onboarding</h2>
                 <p className="text-sm text-gray-500">Acompanhe a chegada dos novos talentos e garanta uma experiência incrível.</p>
               </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Colaboradores</p>
                   <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                     {teamMembers.map(m => (
                       <button 
                         key={m.uid} 
                         onClick={() => setSelectedMember(m)}
                         className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white shadow-lg' : 'bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                       >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
                               {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{m.displayName[0]}</div>}
                             </div>
                             <span className="text-xs font-bold text-left truncate max-w-[120px]">{m.displayName}</span>
                          </div>
                          <ChevronRight size={14} className={selectedMember?.uid === m.uid ? 'text-white' : 'text-gray-400'} />
                       </button>
                     ))}
                   </div>
                </div>
                
                <div className="lg:col-span-3 bg-black/20 rounded-3xl p-8 border border-white/5 min-h-[400px]">
                   {selectedMember ? (
                      <div className="animate-in fade-in duration-300">
                         <div className="flex justify-between items-start mb-8">
                            <div>
                               <h3 className="text-2xl font-bold">{selectedMember.displayName}</h3>
                               <p className="text-gray-500">{selectedMember.jobTitle || 'Sem cargo definido'}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Início</p>
                               <p className="font-medium">{selectedMember.startDate ? format(parseISO(selectedMember.startDate), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Não informado'}</p>
                            </div>
                         </div>

                         {selectedMember.onboardingTasks ? (
                            <div className="space-y-4">
                               <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-primary-500" /> Checklist de Onboarding</h4>
                                  <span className="text-xs font-bold text-gray-500">
                                     {selectedMember.onboardingTasks.filter(t => t.completed).length} / {selectedMember.onboardingTasks.length} completo
                                  </span>
                               </div>
                               <div className="space-y-2">
                                  {selectedMember.onboardingTasks.map(task => (
                                     <button 
                                        key={task.id}
                                        onClick={() => toggleTask(selectedMember.uid, task.id)}
                                        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-primary-500/30 transition-all text-left group"
                                     >
                                        <div className={`p-1 rounded-full transition-colors ${task.completed ? 'bg-primary-500 text-white' : 'text-gray-400 group-hover:text-primary-500'}`}>
                                           {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                           <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>{task.task}</p>
                                           {task.completedAt && <p className="text-[10px] text-gray-500">Concluído em: {format(task.completedAt, 'dd/MM HH:mm')}</p>}
                                        </div>
                                     </button>
                                  ))}
                               </div>
                            </div>
                         ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                               <Sparkles size={48} className="mx-auto text-blue-500 mb-4 opacity-50" />
                               <h4 className="font-bold text-lg mb-2">Nenhum onboarding ativo</h4>
                               <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">Este colaborador ainda não possui um processo de onboarding iniciado.</p>
                               <button 
                                 onClick={() => assignDefaultTemplate(selectedMember.uid)}
                                 className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all"
                               >
                                  Iniciar Onboarding Padrão
                               </button>
                            </div>
                         )}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-20 grayscale opacity-40">
                         <div className="w-20 h-20 bg-gray-500/20 rounded-full flex items-center justify-center mb-6">
                            <Users size={40} className="text-gray-500" />
                         </div>
                         <h4 className="font-bold text-lg">Selecione um colaborador</h4>
                         <p className="text-gray-500 text-sm max-w-xs">Escolha alguém na lista à esquerda para gerenciar seu progresso de onboarding.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

        {activeTab === 'vacations' && (
          <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                   <Calendar size={24} />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold">Gestão de Ausências</h2>
                   <p className="text-sm text-gray-500">Férias, licenças e folgas da equipe.</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowVacationModal(true)}
                 className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
               >
                 <Plus size={18} /> Nova Solicitação
               </button>
             </div>

             <div className="space-y-4">
                {vacations.length === 0 ? (
                   <div className="text-center py-20 bg-gray-100 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                      <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Nenhuma ausência registrada.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {vacations.sort((a,b) => b.createdAt - a.createdAt).map(v => {
                         const user = teamProfiles.find(p => p.uid === v.userId);
                         const isFuture = new Date(v.start) > new Date();
                         return (
                            <div key={v.id} className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                               <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                        {user?.photoURL ? <img src={user.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center font-bold">{user?.displayName?.[0] || '?'}</div>}
                                     </div>
                                     <div>
                                        <p className="font-bold text-sm">{user?.displayName || 'Membro Excluído'}</p>
                                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider">{v.type}</p>
                                     </div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' : v.status === 'Recusado' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                     {v.status}
                                  </span>
                               </div>
                               <div className="flex items-center justify-between text-xs py-3 border-t border-b border-gray-100 dark:border-white/5 mb-4 font-medium">
                                  <div className="flex flex-col">
                                     <span className="text-[10px] text-gray-400">Início</span>
                                     {format(parseISO(v.start), 'dd/MM/yyyy')}
                                  </div>
                                  <ChevronRight size={14} className="text-gray-300" />
                                  <div className="flex flex-col text-right">
                                     <span className="text-[10px] text-gray-400">Fim</span>
                                     {format(parseISO(v.end), 'dd/MM/yyyy')}
                                  </div>
                               </div>
                               {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && v.status === 'Pendente' && (
                                  <div className="flex gap-2">
                                     <button onClick={() => updateVacationStatus(v.id, 'Aprovado')} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors">Aprovar</button>
                                     <button onClick={() => updateVacationStatus(v.id, 'Recusado')} className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-colors">Recusar</button>
                                  </div>
                               )}
                            </div>
                         );
                      })}
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'development' && (
           <div className="flex flex-col items-center justify-center p-20 bg-white/30 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[3rem] animate-pulse">
              <Clock size={48} className="text-primary-500 mb-4" />
              <h2 className="text-xl font-bold">Em Breve</h2>
              <p className="text-gray-500">Este módulo está sendo finalizado para oferecer a melhor experiência de gestão.</p>
           </div>
        )}

        {/* Modal de Nova Ausência */}
        {showVacationModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowVacationModal(false)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                 <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                    <div>
                       <h3 className="text-2xl font-bold">Solicitar Ausência</h3>
                       <p className="text-sm text-gray-500">Informe o período e o motivo.</p>
                    </div>
                    <button onClick={() => setShowVacationModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                       <X size={24} />
                    </button>
                 </div>
                 
                 <form onSubmit={handleAddVacation} className="p-8 space-y-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Colaborador</label>
                       <select 
                          required
                          className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium"
                          value={newVacation.userId || ''}
                          onChange={e => setNewVacation({...newVacation, userId: e.target.value})}
                       >
                          <option value="">Selecione um membro...</option>
                          {teamProfiles.map(p => (
                             <option key={p.uid} value={p.uid}>{p.displayName}</option>
                          ))}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Início</label>
                          <input 
                             type="date"
                             required
                             className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all"
                             value={newVacation.start}
                             onChange={e => setNewVacation({...newVacation, start: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Fim</label>
                          <input 
                             type="date"
                             required
                             className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all"
                             value={newVacation.end}
                             onChange={e => setNewVacation({...newVacation, end: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Ausência</label>
                       <div className="grid grid-cols-2 gap-2">
                          {['Férias', 'Licença', 'Folga', 'Outro'].map(type => (
                             <button
                                key={type}
                                type="button"
                                onClick={() => setNewVacation({...newVacation, type: type as any})}
                                className={`p-4 rounded-2xl text-sm font-bold border transition-all ${newVacation.type === type ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-white/5 border-transparent hover:border-white/10 text-gray-500'}`}
                             >
                                {type}
                             </button>
                          ))}
                       </div>
                    </div>

                    <button type="submit" className="w-full bg-primary-500 hover:bg-primary-600 text-white p-5 rounded-2xl font-bold shadow-xl shadow-primary-500/20 transition-all flex items-center justify-center gap-2 mt-4">
                       Confirmar Solicitação
                    </button>
                 </form>
              </div>
           </div>
        )}
      </div>
   </div>
);
}
