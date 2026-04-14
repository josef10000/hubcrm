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
  Activity,
  PlusCircle,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Settings,
  Plus,
  X,
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '../types';
import { format, differenceInYears, parseISO, isSameDay, addDays, isWithinInterval } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { VacationPeriod, PDICategory, PDIAction, UserProfilePeople } from '../types/people';
import BroadcastTab from '../components/people/BroadcastTab';

import AssetManager from '../components/people/AssetManager';
import SkillRadar from '../components/people/SkillRadar';
import CareerTimeline from '../components/people/CareerTimeline';
import DocumentManager from '../components/people/DocumentManager';
import FeedbackBoard from '../components/people/FeedbackBoard';
import { Package } from 'lucide-react';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'vacations' | 'climate' | 'broadcast' | 'assets';

export default function PeopleView() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const { 
    vacations, 
    teamProfiles, 
    effectiveOrgId,
    enpsQuestion,
    setEnpsQuestion,
    enpsFrequency,
    setEnpsFrequency,
    supportRequests
  } = useCRM();

  const isAdminOrManager = userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente';

  // Métrica CSAT Geral
  const ratedRequests = supportRequests.filter(req => req.status === 'concluido' && req.csatScore);
  const csatScoreAvg = ratedRequests.length > 0 
    ? (ratedRequests.reduce((acc, curr) => acc + curr.csatScore, 0) / ratedRequests.length).toFixed(1)
    : null;
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    reason: 'Férias',
    status: 'Pendente',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

  // Novos estados para exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);

  // PDI
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newActionText, setNewActionText] = useState<{ [key: string]: string }>({});

  // eNPS
  const [enpsResults, setEnpsResults] = useState<any[]>([]);
  const [enpsScoreCalc, setEnpsScoreCalc] = useState<number | null>(null);
  const [showClearEnpsConfirm, setShowClearEnpsConfirm] = useState(false);
  const [isClearingEnps, setIsClearingEnps] = useState(false);

  const [memberSubTab, setMemberSubTab] = useState<'overview' | 'skills' | 'timeline' | 'docs' | 'feedback'>('overview');
  
  useEffect(() => {
    if (!effectiveOrgId) return;

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'enps_results'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnpsResults(results);

      if (results.length > 0) {
        const promoters = results.filter((r: any) => r.score >= 9).length;
        const detractors = results.filter((r: any) => r.score <= 6).length;
        const total = results.length;
        const score = Math.round(((promoters - detractors) / total) * 100);
        setEnpsScoreCalc(score);
      } else {
        setEnpsScoreCalc(null);
      }
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

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

  const handleClearEnpsData = async () => {
    if (!effectiveOrgId) return;
    setIsClearingEnps(true);
    try {
      const promises = enpsResults.map(r => deleteDoc(doc(db, 'organizations', effectiveOrgId, 'enps_results', r.id)));
      await Promise.all(promises);
      setShowClearEnpsConfirm(false);
      toast.success('Dados da pesquisa limpos com sucesso!');
    } catch (error) {
      console.error("Error clearing eNPS data:", error);
      toast.error('Erro ao limpar dados.');
    } finally {
      setIsClearingEnps(false);
    }
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
          completedAt: isNowCompleted ? Date.now() : null 
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
          act.id === actionId ? { ...act, completed: !act.completed, completedAt: !act.completed ? Date.now() : null } : act
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
      const vRef = doc(collection(db, 'organizations', effectiveOrgId, 'vacations'));
      await setDoc(vRef, {
        ...newVacation,
        id: vRef.id,
        createdAt: Date.now()
      });
      setShowVacationModal(false);
      toast.success('Solicitação de ausência enviada!');
    } catch (error) {
      toast.error('Erro ao salvar ausência.');
    }
  };

  const updateVacationStatus = async (id: string, status: 'Aprovado' | 'Recusado') => {
    if (!effectiveOrgId) return;
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
    setVacationToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVacation = async () => {
    if (!effectiveOrgId || !vacationToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'vacations', vacationToDelete));
      toast.success('Registro excluído com sucesso!');
      setShowDeleteConfirm(false);
      setVacationToDelete(null);
    } catch (error) {
      console.error('[Vacation] Erro ao excluir:', error);
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
        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-8 w-max max-w-full overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'onboarding' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Sparkles size={18} />
            <span>Onboarding</span>
          </button>
          <button 
            onClick={() => setActiveTab('development')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'development' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Target size={18} />
            <span>Desenvolvimento</span>
          </button>
          <button 
            onClick={() => setActiveTab('vacations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'vacations' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Calendar size={18} />
            <span>Ausências</span>
          </button>
          {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
            <button 
              onClick={() => setActiveTab('climate')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'climate' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Smile size={18} />
              <span>Clima</span>
            </button>
          )}
          {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
            <button 
              onClick={() => setActiveTab('broadcast')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'broadcast' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <MessageSquare size={18} />
              <span>Comunicados</span>
            </button>
          )}
          {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
            <button 
              onClick={() => setActiveTab('assets')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'assets' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Package size={18} />
              <span>Ativos</span>
            </button>
          )}
        </div>

        {/* Content Rendering */}
        <div className="relative">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
              {/* Alertas de Bem-Estar */}
              <div className="md:col-span-1 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2 font-sans dark:text-white">
                    <Activity className="text-rose-500" /> Saúde do Time
                  </h3>
                  <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">Atenção</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const moodAlerts = teamMembers.filter(m => {
                      if (!m.moodLogs || m.moodLogs.length < 3) return false;
                      const last3 = m.moodLogs.slice(-3);
                      return last3.every(log => log.score <= 2);
                    });
                    
                    if (moodAlerts.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-4">
                          <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                          <p className="text-xs text-gray-500">O time está energizado.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Monitorar (3+ dias seguidos)</p>
                        {moodAlerts.map(m => (
                          <div key={m.uid} className="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                              {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{m.displayName[0]}</div>}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate dark:text-white">{m.displayName}</p>
                              <p className="text-[10px] text-rose-500">Baixa energia reportada</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center gap-2 font-sans dark:text-white"><Smile className="text-yellow-500" /> Clima da Equipe</h3>
                  <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg">Mês Atual</span>
                </div>
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className={`text-5xl font-black mb-2 ${enpsScoreCalc === null ? 'text-gray-400' : enpsScoreCalc >= 70 ? 'text-emerald-500' : enpsScoreCalc >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {enpsScoreCalc === null ? '--' : enpsScoreCalc}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {enpsScoreCalc === null ? 'Score eNPS (Aguardando Dados)' : 'Score eNPS Geral'}
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mt-6 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${enpsScoreCalc === null ? 'bg-gray-400' : enpsScoreCalc >= 70 ? 'bg-emerald-500' : enpsScoreCalc >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${Math.max(0, Math.min(100, enpsScoreCalc !== null ? (enpsScoreCalc + 100) / 2 : 0))}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4">
                    {enpsResults.length === 0 ? 'Os dados serão atualizados assim que as pesquisas forem respondidas.' : `Baseado em ${enpsResults.length} respostas anônimas.`}
                  </p>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold flex items-center gap-2"><Star className="text-amber-500" /> Satisfação (CSAT)</h3>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">Geral</span>
                </div>
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className={`text-5xl font-black mb-2 ${csatScoreAvg === null ? 'text-gray-400' : Number(csatScoreAvg) >= 4.5 ? 'text-emerald-500' : Number(csatScoreAvg) >= 3.5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {csatScoreAvg === null ? '--' : csatScoreAvg}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {csatScoreAvg === null ? 'Média CSAT (Aguardando Dados)' : 'Média de Avaliações'}
                  </div>
                  <div className="flex gap-1 mt-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={20} 
                        className={Number(csatScoreAvg) >= star ? 'fill-amber-500 text-amber-500' : 'text-gray-300 dark:text-white/10'} 
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4">
                    {ratedRequests.length === 0 ? 'Nenhum chamado avaliado ainda.' : `Baseado em ${ratedRequests.length} atendimentos concluídos.`}
                  </p>
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
                   {teamMembers.filter(m => {
                     const total = m.onboardingTasks?.length || 0;
                     const completed = m.onboardingTasks?.filter(t => t.completed).length || 0;
                     return total > 0 && completed < total;
                   }).map(m => {
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
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-4">
                               <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center overflow-hidden">
                                  {selectedMember.photoURL ? <img src={selectedMember.photoURL} alt="" className="w-full h-full object-cover" /> : <Users className="text-primary-500" size={32} />}
                               </div>
                               <div>
                                  <h3 className="text-2xl font-bold dark:text-white leading-tight">{selectedMember.displayName}</h3>
                                  <p className="text-sm text-gray-400 font-medium">{selectedMember.jobTitle || 'Sem cargo definido'}</p>
                               </div>
                            </div>
                            
                            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 overflow-x-auto">
                               {[
                                 { id: 'overview', label: 'Visão Geral', icon: Sparkles },
                                 { id: 'skills', label: 'Competências', icon: Target },
                                 { id: 'timeline', label: 'Carreira', icon: TrendingUp },
                                 { id: 'docs', label: 'Documentos', icon: Package },
                                 { id: 'feedback', label: 'Feedbacks', icon: MessageSquare }
                               ].map(tab => (
                                 <button 
                                   key={tab.id}
                                   onClick={() => setMemberSubTab(tab.id as any)}
                                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${memberSubTab === tab.id ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                 >
                                   <tab.icon size={14} />
                                   {tab.label}
                                 </button>
                               ))}
                             </div>
                           </div>
                           
                           {memberSubTab === 'overview' && (
                              <div className="animate-in fade-in slide-in-from-right duration-300">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 font-sans">Checklist de Onboarding</h4>
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
                          )}

                          {memberSubTab === 'skills' && (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right duration-300">
                                <div className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-8">
                                   <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 font-sans">Matriz de Competências</h4>
                                   <SkillRadar skills={(selectedMember as any).skills || []} />
                                </div>
                                <div className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-8">
                                   <h4 className="font-bold text-gray-900 dark:text-white mb-6 font-sans">Sugestão de Desenvolvimento</h4>
                                   <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                      Com base na matriz ao lado, foque em desenvolver as competências com menor pontuação para equilibrar o perfil profissional.
                                   </p>
                                   <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl italic text-xs text-primary-600 font-medium font-sans">
                                      "O desenvolvimento contínuo é a chave para o sucesso na Hub Symples."
                                   </div>
                                </div>
                             </div>
                          )}

                          {memberSubTab === 'timeline' && (
                             <div className="animate-in fade-in slide-in-from-right duration-300">
                                <CareerTimeline milestones={selectedMember.careerTimeline || []} />
                             </div>
                          )}

                          {memberSubTab === 'docs' && (
                             <div className="animate-in fade-in slide-in-from-right duration-300">
                                <DocumentManager userId={selectedMember.uid} />
                             </div>
                          )}

                          {memberSubTab === 'feedback' && (
                             <div className="animate-in fade-in slide-in-from-right duration-300">
                                <FeedbackBoard userId={selectedMember.uid} />
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

               <div className="md:col-span-4 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2 font-sans dark:text-white"><Activity className="text-rose-500" /> Saúde Diária da Equipe</h3>
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Tempo Real</span>
                  </div>
                  
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[10px] text-gray-400 uppercase font-black tracking-widest border-b border-gray-100 dark:border-white/5">
                          <th className="pb-4 px-4 font-black">Colaborador / Cargo</th>
                          <th className="pb-4 px-4 font-black">Último Reporte (Horário)</th>
                          <th className="pb-4 px-4 font-black">Energia / Humor</th>
                          <th className="pb-4 px-4 text-right font-black">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.sort((a,b) => {
                          const lastA = a.moodLogs?.[a.moodLogs.length-1]?.timestamp || 0;
                          const lastB = b.moodLogs?.[b.moodLogs.length-1]?.timestamp || 0;
                          return lastB - lastA;
                        }).map(m => {
                          const lastLog = m.moodLogs?.[m.moodLogs.length - 1];
                          const score = lastLog?.score || 0;
                          const moodEmojis = ['😴', '😫', '😐', '🙂', '🔥'];
                          
                          return (
                            <tr key={m.uid} className="group bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden hover:bg-white/50 dark:hover:bg-white/10 transition-all">
                              <td className="py-4 px-4 first:rounded-l-2xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                                    {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{m.displayName[0]}</div>}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold dark:text-white">{m.displayName}</p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{m.jobTitle}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {lastLog ? (
                                  <div>
                                    <p className="text-xs font-bold dark:text-white">{format(lastLog.timestamp, 'HH:mm', { locale: ptBR })}</p>
                                    <p className="text-[9px] text-gray-500">{format(lastLog.timestamp, "dd 'de' MMM", { locale: ptBR })}</p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">Sem registros</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {lastLog ? (
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg grayscale-0 drop-shadow-sm">{moodEmojis[score - 1]}</span>
                                    <div className="flex-1 min-w-[80px] h-1.5 bg-gray-100 dark:bg-black/20 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-700 ${score <= 2 ? 'bg-rose-500' : score === 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${(score / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className={`text-[10px] font-black ${score <= 2 ? 'text-rose-500' : score === 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {score}/5
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">N/A</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right last:rounded-r-2xl">
                                <button 
                                  onClick={() => { setSelectedMember(m); setActiveTab('dashboard'); }}
                                  className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 px-4 py-2 bg-primary-500/10 rounded-xl transition-all"
                                >
                                  Ver Detalhes
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                                {isAdminOrManager && (
                                  <button onClick={() => addPDICategory(selectedMember.uid)} className="absolute right-2 top-1.5 text-primary-500"><PlusCircle size={16} /></button>
                                )}
                              </div>
                            </div>
                          </div>

                          {(selectedMember.pdiCategories || []).length > 0 ? (
                            <div className="space-y-6">
                               {selectedMember.pdiCategories!.map(cat => (
                                 <div key={cat.id} className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-6 relative group/cat">
                                    <div className="flex justify-between items-center mb-6">
                                       <h4 className="font-bold flex items-center gap-2"><ChevronDown size={18} className="text-indigo-500" /> {cat.title}</h4>
                                       {isAdminOrManager && (
                                         <button onClick={() => removePDICategory(selectedMember.uid, cat.id)} className="opacity-0 group-hover/cat:opacity-100 p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                                       )}
                                    </div>

                                    <div className="space-y-3 mb-6">
                                       {cat.actions.map(action => (
                                         <div key={action.id} className="flex items-center gap-3 p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group/act">
                                            <button 
                                              onClick={() => togglePDIAction(selectedMember.uid, cat.id, action.id)}
                                              disabled={!isAdminOrManager}
                                              className={`shrink-0 ${action.completed ? 'text-indigo-500' : 'text-gray-300 hover:text-indigo-400'} transition-all disabled:opacity-50`}
                                            >
                                              {action.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${action.completed ? 'line-through text-gray-400' : 'font-medium'}`}>{action.description}</span>
                                            {action.completedAt && <span className="text-[10px] text-gray-400">{format(action.completedAt, 'dd/MM')}</span>}
                                         </div>
                                       ))}
                                    </div>

                                    {isAdminOrManager && (
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
                                    )}
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

          {/* CLIMATE (eNPS) TAB */}
          {activeTab === 'climate' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500">
                  <Smile size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configurações de Clima (eNPS)</h2>
                  <p className="text-sm text-gray-500">Configure como e quando os colaboradores avaliam a empresa.</p>
                </div>
                {enpsResults.length > 0 && (
                  <button 
                    onClick={() => setShowClearEnpsConfirm(true)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all text-xs font-bold"
                  >
                    <Trash2 size={14} />
                    Limpar Dados Históricos
                  </button>
                )}
              </div>

              <div className="max-w-2xl space-y-8">
                <div className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Settings className="text-primary-500" size={20} />
                    Parâmetros da Pesquisa
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Pergunta da Pesquisa</label>
                      <textarea
                        value={enpsQuestion}
                        onChange={(e) => setEnpsQuestion(e.target.value)}
                        className="w-full h-24 px-4 py-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all"
                        placeholder="Ex: Em uma escala de 0 a 10, o quanto você recomendaria trabalhar aqui?"
                      />
                      <p className="mt-2 text-[10px] text-gray-400 italic">As respostas são 100% anônimas para garantir a sinceridade dos feedbacks.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Frequência de Disparo</label>
                      <select
                        value={enpsFrequency}
                        onChange={(e) => setEnpsFrequency(e.target.value as any)}
                        className="w-full px-4 py-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer transition-all"
                      >
                        <option value="mensal" className="bg-zinc-900">Mensal (Recomendado)</option>
                        <option value="trimestral" className="bg-zinc-900">Trimestral</option>
                        <option value="semestral" className="bg-zinc-900">Semestral</option>
                      </select>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={async () => {
                          if (!effectiveOrgId) return;
                          try {
                            await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                              enpsQuestion, 
                              enpsFrequency 
                            }, { merge: true });
                            toast.success('Configurações de clima salvas com sucesso!');
                          } catch (error) {
                            toast.error('Erro ao salvar configurações.');
                          }
                        }}
                        className="flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-all font-bold shadow-lg shadow-primary-500/20 active:scale-95"
                      >
                        <CheckCircle2 size={18} />
                        Salvar Configurações
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-primary-500/5 border border-primary-500/10 rounded-3xl">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-primary-500" />
                    Dica de Especialista
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Pesquisas mensais ajudam a detectar quedas de engajamento rapidamente. O anonimato é crucial: o sistema registra apenas QUE o colaborador respondeu (para controlar a periodicidade), mas nunca O QUE ele respondeu.
                  </p>
                </div>

                {/* Resultados e Feedbacks */}
                <div className="mt-12 bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <MessageSquare className="text-primary-500" size={20} />
                    Últimos Feedbacks e Comentários
                  </h3>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {enpsResults.filter(r => r.comment).length > 0 ? (
                      enpsResults.filter(r => r.comment).map((result, idx) => (
                        <div key={result.id || idx} className="p-4 bg-gray-100/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl animate-in fade-in slide-in-from-right duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${result.score >= 9 ? 'bg-emerald-500/10 text-emerald-500' : result.score >= 7 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                Nota: {result.score}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {result.createdAt?.toMillis ? format(result.createdAt.toMillis(), 'dd MMM yyyy', { locale: ptBR }) : 'Recentemente'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{result.comment}"</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-gray-500 italic text-sm">
                        Nenhum comentário recebido ainda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <BroadcastTab teamMembers={teamMembers} />
            </div>
          )}

          {/* ASSETS TAB */}
          {activeTab === 'assets' && (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture') && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <AssetManager />
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

        {/* Modal de Confirmação de Exclusão eNPS */}
        {showClearEnpsConfirm && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={() => setShowClearEnpsConfirm(false)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-gray-200 dark:border-white/10 w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center" onClick={e => e.stopPropagation()}>
                 <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                   <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-xl font-bold mb-2">Apagar todos os dados?</h3>
                 <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                   Tem certeza que deseja apagar os dados da pesquisa atual? Esta ação é irreversível e removerá todas as notas e comentários.
                 </p>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setShowClearEnpsConfirm(false)}
                     className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleClearEnpsData}
                     disabled={isClearingEnps}
                     className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                   >
                     {isClearingEnps ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
                   </button>
                 </div>
              </div>
           </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteConfirm && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-gray-200 dark:border-white/10 w-full max-w-sm shadow-2xl overflow-hidden p-8 text-center" onClick={e => e.stopPropagation()}>
                 <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                   <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-xl font-bold mb-2">Excluir Registro?</h3>
                 <p className="text-sm text-gray-500 mb-8">Esta ação não pode ser desfeita. O registro de ausência será removido permanentemente.</p>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setShowDeleteConfirm(false)}
                     className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={confirmDeleteVacation}
                     className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                   >
                     Excluir
                   </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
