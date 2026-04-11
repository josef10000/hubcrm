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

  const { vacations, teamProfiles, effectiveOrgId } = useCRM();
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    status: 'Pendente',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

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
                      <div key={m.uid} className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10 scale-in-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                            {m.photoURL ? <img src={m.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center font-bold">{m.displayName[0]}</div>}
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
                     <div className="space-y-1">
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
                                {selectedMember.onboardingTasks.map(t => (
                                   <div key={t.id} onClick={() => toggleTask(selectedMember.uid, t.id)} className="flex items-center gap-3 p-4 bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                                      {t.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-gray-300" />}
                                      <span className={t.completed ? 'line-through opacity-40' : 'font-medium'}>{t.task}</span>
                                   </div>
                                ))}
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
                      <div key={v.id} className="p-6 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] uppercase font-black text-gray-400">{v.type}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                               {v.status}
                            </span>
                         </div>
                         <p className="font-bold text-sm mb-4">{user?.displayName || 'Membro'}</p>
                         <div className="flex items-center justify-between text-xs py-3 border-t border-gray-100 dark:border-white/5">
                            <div><span className="text-[10px] text-gray-400 block">De</span>{v.start}</div>
                            <div><span className="text-[10px] text-gray-400 block text-right">Até</span>{v.end}</div>
                         </div>
                         {v.status === 'Pendente' && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') && (
                           <div className="mt-4 flex gap-2">
                              <button onClick={() => updateVacationStatus(v.id, 'Aprovado')} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">Aprovar</button>
                              <button onClick={() => updateVacationStatus(v.id, 'Recusado')} className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold">Recusar</button>
                           </div>
                         )}
                      </div>
                     );
                  })}
               </div>
            </div>
          )}

          {/* DEVELOPMENT TAB */}
          {activeTab === 'development' && (
             <div className="p-20 bg-white/20 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[3rem] text-center">
                <Clock size={48} className="mx-auto text-primary-500 mb-4" />
                <h2 className="text-xl font-bold">Desenvolvimento (PDI)</h2>
                <p className="text-gray-500 font-medium">Este módulo está sendo preparado para o próximo ciclo.</p>
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
