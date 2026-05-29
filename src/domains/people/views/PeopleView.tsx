import React, { useState, useEffect, useRef } from 'react';
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
  PlusCircle,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Settings,
  Plus,
  X,
  Package,
  Globe
} from 'lucide-react';
import { usePermissions } from '@auth/hooks/usePermissions';
import AssetManager from '@people/components/AssetManager';
import FeedbackBoard from '@people/components/FeedbackBoard';
import CareerTimeline from '@people/components/CareerTimeline';
import AddMilestoneModal from '@people/components/AddMilestoneModal';
import SkillRadar from '@people/components/SkillRadar';
import EditSkillsModal from '@people/components/EditSkillsModal';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '@/types';
import { format, differenceInYears, parseISO, isSameDay, addDays } from 'date-fns';
import { useCRM } from '@crm/contexts/CRMContext';
import { useCRMStore } from '@/store/useCRMStore';
import { TimeLog, calculateNetDuration, getLocalDateString } from '@/store/slices/timeTrackingSlice';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { VacationPeriod, PDICategory, PDIAction } from '@/types/people';
import { PDIKanban } from '@people/components/PDIKanban';
import { EnergyScoreCard } from '@people/components/EnergyScoreCard';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'career' | 'mural' | 'assets' | 'vacations' | 'climate' | 'expediente';

const formatToBrasiliaTime = (timestamp: number, formatStr: 'HH:mm:ss' | 'HH:mm' | 'dd/MM/yyyy'): string => {
  const date = new Date(timestamp);
  if (formatStr === 'HH:mm:ss') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }
  if (formatStr === 'HH:mm') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export default function PeopleView() {
  const { user } = useAuth();
  const crm = useCRM();
  const { userProfile, teamProfiles: crmTeamProfiles, effectiveOrgId: crmOrgId } = crm;
  const effectiveOrgId = crmOrgId || '';

  const subscribeToPeople = useCRMStore(s => s.subscribeToPeople);

  useEffect(() => {
    if (crmOrgId) {
      return subscribeToPeople(crmOrgId);
    }
  }, [crmOrgId, subscribeToPeople]);

  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedMemberForAttendance, setSelectedMemberForAttendance] = useState<UserProfile | null>(null);

  const allLogs = useCRMStore(s => s.allLogs);
  const loadAllLogs = useCRMStore(s => s.loadAllLogs);
  const [elapsedTimes, setElapsedTimes] = useState<{ [userId: string]: number }>({});

  const allLogsRef = useRef(allLogs);
  useEffect(() => {
    allLogsRef.current = allLogs;
  }, [allLogs]);

  // Efeito 1: Assinatura estável dos logs do Firestore
  useEffect(() => {
    if (activeTab !== 'expediente' || !effectiveOrgId) return;
    const unsub = loadAllLogs();
    return () => unsub();
  }, [activeTab, effectiveOrgId]);

  // Efeito 2: Timer reativo independente de re-assinatura
  useEffect(() => {
    if (activeTab !== 'expediente' || !effectiveOrgId) return;

    const timer = setInterval(() => {
      const todayStr = getLocalDateString();
      const newElapsed: { [userId: string]: number } = {};

      allLogsRef.current.forEach(log => {
        if (log.date === todayStr) {
          if (log.status === 'active') {
            newElapsed[log.userId] = calculateNetDuration(log.startTime, undefined, log.pauses);
          } else {
            newElapsed[log.userId] = log.totalDuration;
          }
        }
      });

      setElapsedTimes(newElapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, effectiveOrgId]);

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };
  
  // Estados para Gestão Local e Interatividade
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Blindagem de Dados (Safe Mode)
  const { 
    vacations: rawVacations = [], 
    enpsQuestion = '',
    setEnpsQuestion = () => {},
    enpsFrequency = 'mensal',
    setEnpsFrequency = () => {}
  } = crm || {};

  const vacations = Array.isArray(rawVacations) ? rawVacations : [];
  const teamProfiles = Array.isArray(crmTeamProfiles) ? crmTeamProfiles : [];

  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    reason: 'Férias',
    status: 'Pendente',
    description: '',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);

  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newActionText, setNewActionText] = useState<{ [key: string]: string }>({});

  const { hasPermission } = usePermissions();
  const isAdminOrGerente = hasPermission('MANAGE_TEAM');

  const [enpsResults, setEnpsResults] = useState<any[]>([]);
  const [enpsScoreCalc, setEnpsScoreCalc] = useState<number | null>(null);
  const [showClearEnpsConfirm, setShowClearEnpsConfirm] = useState(false);
  const [isClearingEnps, setIsClearingEnps] = useState(false);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  // Estados para Recusa de Ausência
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [vacationToReject, setVacationToReject] = useState<VacationPeriod | null>(null);

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

  const toggleTask = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;
    const updatedTasks = member.onboardingTasks.map(t => {
      if (t.id === taskId) {
        const isNowCompleted = !t.completed;
        return { ...t, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : null };
      }
      return t;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: updatedTasks });
      toast.success('Tarefa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const addTaskToOnboarding = async (memberUid: string, taskDescription: string) => {
    if (!taskDescription.trim()) return;
    try {
      const newTask: OnboardingTask = { id: Date.now().toString(), task: taskDescription, completed: false };
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: arrayUnion(newTask) });
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
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: arrayRemove(taskToRemove) });
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
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: defaultTasks });
      toast.success('Checklist padrão atribuído!');
    } catch (error) {
      toast.error('Erro ao atribuir checklist.');
    }
  };

  const addPDICategory = async (memberUid: string) => {
    if (!newCategoryTitle.trim()) return;
    const member = teamMembers.find(m => m.uid === memberUid);
    const categories = member?.pdiCategories || [];
    const newCategory: PDICategory = { id: Date.now().toString(), title: newCategoryTitle, actions: [] };
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: [...categories, newCategory] });
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
        const newAction: PDIAction = { id: Date.now().toString(), description: text, completed: false };
        return { ...cat, actions: [...cat.actions, newAction] };
      }
      return cat;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      setNewActionText(prev => ({ ...prev, [categoryId]: '' }));
      toast.success('Ação adicionada ao PDI!');
    } catch (error) {
      toast.error('Erro ao adicionar ação.');
    }
  };

  const togglePDIAction = async (memberUid: string, categoryId: string, actionId: string) => {
    if (!isAdminOrGerente) {
      toast.error('Apenas gestores podem validar o progresso do PDI.');
      return;
    }
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;
    const updatedCategories = member.pdiCategories.map(cat => {
      if (cat.id === categoryId) {
        const updatedActions = cat.actions.map(act => act.id === actionId ? { ...act, completed: !act.completed, completedAt: !act.completed ? Date.now() : null } : act);
        return { ...cat, actions: updatedActions };
      }
      return cat;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      toast.success('PDI atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar PDI.');
    }
  };

  const removePDICategory = async (memberUid: string, categoryId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;
    const updatedCategories = member.pdiCategories.filter(cat => cat.id !== categoryId);
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      toast.success('Categoria removida.');
    } catch (error) {
      toast.error('Erro ao remover categoria.');
    }
  };

  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacation.userId || !newVacation.start || !newVacation.end || !newVacation.description?.trim()) {
      toast.error('Preencha todos os campos, incluindo a justificativa!');
      return;
    }

    try {
      await crm.handleSaveVacationRequest(newVacation);
      // Sucesso Real: Fecha o modal e limpa os campos
      setShowVacationModal(false);
      setNewVacation({
        type: 'Férias',
        reason: 'Férias',
        status: 'Pendente',
        description: '',
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
      });
    } catch (error) {
      // Falha Real de Conexão/Permissão: Mantém o modal aberto e os dados intactos para re-tentativa
      console.error("Erro ao salvar ausência na UI:", error);
    }
  };

  const updateVacationStatus = async (vacation: VacationPeriod, status: 'Aprovado' | 'Recusado') => {
    if (status === 'Recusado') {
      setVacationToReject(vacation);
      setShowRejectionModal(true);
      return;
    }
    await crm.handleSaveVacationRequest({ ...vacation, status });
  };

  const handleConfirmRejection = async () => {
    if (!vacationToReject || !rejectionReason.trim()) {
      toast.error('Informe o motivo da recusa!');
      return;
    }
    try {
      await crm.handleSaveVacationRequest({ 
        ...vacationToReject, 
        status: 'Recusado',
        hrFeedback: rejectionReason.trim()
      });
      setShowRejectionModal(false);
      setRejectionReason('');
      setVacationToReject(null);
    } catch (e) {
      console.error("Erro ao recusar ausência na UI:", e);
    }
  };

  const deleteVacation = async (id: string) => {
    setVacationToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVacation = async () => {
    if (!vacationToDelete) return;
    try {
      await crm.handleDeleteVacationRequest(vacationToDelete);
      setShowDeleteConfirm(false);
      setVacationToDelete(null);
    } catch (e) {
      console.error("Erro ao excluir ausência na UI:", e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartHandshake className="text-pink-500" /> People & Culture
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Desenvolvimento, bem-estar e cultura da equipe.</p>
          </div>
        </div>

        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-8 w-fit overflow-x-auto">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'onboarding', icon: Sparkles, label: 'Onboarding' },
            { id: 'development', icon: Target, label: 'Desenvolvimento' },
            { id: 'career', icon: TrendingUp, label: 'Carreira' },
            { id: 'mural', icon: MessageSquare, label: 'Mural' },
            { id: 'assets', icon: Package, label: 'Ativos' },
            { id: 'vacations', icon: Calendar, label: 'Ausências' },
            { id: 'expediente', icon: Clock, label: 'Expediente Ao Vivo' },
            { id: 'climate', icon: Smile, label: 'Clima', restricted: true }
          ].filter(t => !t.restricted || isAdminOrGerente).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as PeopleSubTab)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shrink-0 ${activeTab === t.id ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl text-center">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Smile className="text-yellow-500" /> Clima Geral</h3>
                 <div className={`text-5xl font-black mb-2 ${enpsScoreCalc === null ? 'text-gray-400' : enpsScoreCalc >= 70 ? 'text-emerald-500' : enpsScoreCalc >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {enpsScoreCalc === null ? '--' : enpsScoreCalc}
                 </div>
                 <p className="text-sm text-gray-500">Score eNPS baseada em {enpsResults.length} respostas.</p>
              </div>
              <div className="md:col-span-2 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Cake className="text-pink-500" /> Celebrações</h3>
                 <div className="space-y-4">
                    {teamMembers.filter(celebratesAnniversary).length > 0 ? (
                      teamMembers.filter(celebratesAnniversary).map(m => (
                        <div key={m.uid} className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                                {m.photoURL && <img src={m.photoURL} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <p className="font-bold">{m.displayName}</p>
                                <p className="text-xs text-gray-500">Completando {getTenure(m)}</p>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : <p className="text-center py-10 opacity-30">Nenhuma celebração hoje.</p>}
                 </div>
              </div>
              <div className="md:col-span-3 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Users className="text-blue-500" /> No Radar de Onboarding</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {teamMembers.filter(m => (m.onboardingTasks?.length || 0) > 0 && (m.onboardingTasks?.filter(t => t.completed).length || 0) < (m.onboardingTasks?.length || 0)).map(m => (
                      <button key={m.uid} onClick={() => { setSelectedMember(m); setActiveTab('onboarding'); }} className="p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary-500 transition-all text-left">
                         <p className="text-xs font-bold truncate">{m.displayName}</p>
                         <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-primary-500" style={{ width: `${Math.round(((m.onboardingTasks?.filter(t => t.completed).length || 0) / (m.onboardingTasks?.length || 1)) * 100)}%` }}></div>
                         </div>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Em Onboarding</p>
                     <div className="space-y-1">
                        {teamMembers.filter(m => m.onboardingTasks && m.onboardingTasks.length > 0 && m.onboardingTasks.filter(t => t.completed).length < m.onboardingTasks.length).map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                        ))}
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase mt-8 mb-4">Restante da Equipe</p>
                     <div className="space-y-1">
                        {teamMembers.filter(m => !m.onboardingTasks || m.onboardingTasks.length === 0 || m.onboardingTasks.filter(t => t.completed).length === m.onboardingTasks.length).map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                       <div>
                          <h3 className="text-xl font-bold mb-6">{selectedMember.displayName}</h3>
                          {isAdminOrGerente && (
                            <div className="flex gap-2 mb-6">
                              <input id="new_ob_task" type="text" placeholder="Nova tarefa..." className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-xs" onKeyPress={e => e.key === 'Enter' && addTaskToOnboarding(selectedMember.uid, (e.target as HTMLInputElement).value)} />
                              <button onClick={() => { const i = document.getElementById('new_ob_task') as HTMLInputElement; addTaskToOnboarding(selectedMember.uid, i.value); i.value=''; }} className="px-4 py-2 bg-primary-500 text-white rounded-xl">Add</button>
                            </div>
                          )}
                          <div className="space-y-2">
                             {(selectedMember.onboardingTasks || []).map(t => (
                               <div key={t.id} className="flex items-center gap-3 p-4 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/5">
                                  <div onClick={() => toggleTask(selectedMember.uid, t.id)} className="flex items-center flex-1 gap-3 cursor-pointer">
                                    {t.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-gray-400" />}
                                    <span className={t.completed ? 'line-through opacity-40' : ''}>{t.task}</span>
                                  </div>
                                  {isAdminOrGerente && <button onClick={() => removeTaskFromOnboarding(selectedMember.uid, t.id)} className="text-red-500"><Trash2 size={16} /></button>}
                               </div>
                             ))}
                             {!(selectedMember.onboardingTasks?.length) && isAdminOrGerente && <button onClick={() => assignDefaultTemplate(selectedMember.uid)} className="w-full p-8 border-2 border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-primary-500 transition-all font-bold">Iniciar Checklist Padrão</button>}
                          </div>
                       </div>
                     ) : <div className="text-center py-20 text-gray-500">Selecione um membro</div>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'development' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           {/* Coluna Esquerda: PDI */}
                           <div className="space-y-6">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-bold">Plano de Desenvolvimento (PDI)</h3>
                              </div>
                              <PDIKanban 
                                 items={(selectedMember.pdiItems || []) as any} 
                                 orgId={effectiveOrgId} 
                                 userId={selectedMember.uid} 
                              />
                           </div>

                           {/* Coluna Direita: Energy & Skills */}
                           <div className="space-y-6">
                              <EnergyScoreCard userProfile={selectedMember} />
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-bold">Matriz de Competências</h3>
                                 {isAdminOrGerente && (
                                    <button 
                                       onClick={() => setShowSkillsModal(true)}
                                       className="text-xs font-bold text-primary-500 hover:text-primary-600 transition-all px-3 py-2 bg-primary-500/10 rounded-xl flex items-center gap-2"
                                    >
                                       <Settings size={14} /> Atualizar Matriz
                                    </button>
                                 )}
                              </div>
                              <div className="p-8 bg-white/5 border border-white/5 rounded-3xl min-h-[400px] flex items-center justify-center">
                                 <SkillRadar skills={[
                                    ...(selectedMember.skills?.hard || []).map(s => ({ ...s, type: 'Hard' as const })),
                                    ...(selectedMember.skills?.soft || []).map(s => ({ ...s, type: 'Soft' as const }))
                                 ]} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-primary-400 mb-1">Hard Skills</p>
                                    <p className="text-2xl font-black">{selectedMember.skills?.hard?.length || 0}</p>
                                 </div>
                                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Soft Skills</p>
                                    <p className="text-2xl font-black">{selectedMember.skills?.soft?.length || 0}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-gray-500">Selecione um membro</div>
                      )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'career' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold">Jornada do Colaborador</h2>
                  {isAdminOrGerente && <button onClick={() => setShowMilestoneModal(true)} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold shadow-lg">Adicionar Marco</button>}
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-white/5 pr-4">
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3">
                      {selectedMember ? <CareerTimeline milestones={selectedMember.careerTimeline || []} /> : <div className="text-center py-20 text-gray-500">Selecione um membro</div>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'mural' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in fade-in duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest pl-2">Modo de Visualização</p>
                     <button 
                        onClick={() => setSelectedMember(null)} 
                        className={`w-full text-left p-3 rounded-xl mb-4 flex items-center gap-2 transition-all ${selectedMember === null ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-sm font-medium'}`}
                     >
                        <Globe size={16} /> 
                        <span>Mural Global (Gestão)</span>
                     </button>
                     
                     <p className="text-[10px] font-bold text-gray-400 uppercase mt-8 mb-4 tracking-widest pl-2">Murais Individuais</p>
                     <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                        {teamMembers.map(m => (
                           <button 
                              key={m.uid} 
                              onClick={() => setSelectedMember(m)} 
                              className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white shadow-lg' : 'hover:bg-white/5 text-sm'}`}
                           >
                              {m.displayName}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-3">
                     <FeedbackBoard userId={selectedMember?.uid} />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-white/5 pr-4">
                     <button onClick={() => setSelectedMember(null)} className={`w-full text-left p-3 rounded-xl mb-4 ${selectedMember === null ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>Todos os Ativos</button>
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3"><AssetManager userId={selectedMember?.uid} /></div>
               </div>
            </div>
          )}

          {activeTab === 'vacations' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold">Ausências & Férias</h2>
                  <button onClick={() => setShowVacationModal(true)} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold">Solicitar</button>
               </div>
               
               <div className="space-y-12">
                 {/* Seção de Pendências */}
                 <div>
                    <h3 className="text-xs font-black uppercase text-amber-500 mb-6 tracking-widest flex items-center gap-2">
                       <AlertTriangle size={14} /> Solicitações Pendentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {vacations.filter(v => v.status === 'Pendente').map(v => (
                         <div key={v.id} className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl relative group shadow-xl">
                            <div className="flex justify-between mb-4">
                               <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500">{v.reason}</span>
                            </div>
                            <p className="font-bold text-sm mb-2">{teamProfiles.find(p => p.uid === v.userId)?.displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic">"{v.description}"</p>
                            <div className="flex justify-between text-[10px] py-2 border-t border-white/5 font-mono">
                               <span>{v.start}</span><span>{v.end}</span>
                            </div>
                            {isAdminOrGerente && (
                              <div className="mt-4 flex gap-2">
                                 <button onClick={() => updateVacationStatus(v, 'Aprovado')} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">Aprovar</button>
                                 <button onClick={() => updateVacationStatus(v, 'Recusado')} className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors">Recusar</button>
                              </div>
                            )}
                            {isAdminOrGerente && <button onClick={() => deleteVacation(v.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={12} /></button>}
                         </div>
                       ))}
                       {vacations.filter(v => v.status === 'Pendente').length === 0 && (
                         <div className="md:col-span-3 py-10 text-center opacity-30 text-sm border-2 border-dashed border-white/5 rounded-3xl">Nenhuma solicitação pendente no momento.</div>
                       )}
                    </div>
                 </div>

                 {/* Seção de Histórico */}
                 {vacations.filter(v => v.status !== 'Pendente').length > 0 && (
                   <div className="pt-8 border-t border-white/5">
                      <h3 className="text-xs font-black uppercase text-gray-500 mb-6 tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Histórico de Ausências
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         {vacations.filter(v => v.status !== 'Pendente').map(v => (
                           <div key={v.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl opacity-80 group hover:opacity-100 transition-all">
                              <div className="flex justify-between mb-2">
                                 <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{v.status}</span>
                                 <span className="text-[8px] text-gray-500">{v.reason}</span>
                              </div>
                              <p className="font-bold text-xs truncate mb-1">{teamProfiles.find(p => p.uid === v.userId)?.displayName}</p>
                              <p className="text-[10px] text-gray-400 line-clamp-1 mb-3 italic">"{v.description}"</p>
                              <div className="flex justify-between text-[10px] text-gray-500 border-t border-white/5 pt-2">
                                 <span>{v.start}</span><span>{v.end}</span>
                              </div>
                             {isAdminOrGerente && <button onClick={() => deleteVacation(v.id)} className="mt-2 text-[8px] text-red-500/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 uppercase font-black">Remover do Histórico</button>}
                         ))}
                      </div>
                   </div>
                 )}
                  {activeTab === 'expediente' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
               <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
                 <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                   <div className="flex items-center">
                     <Clock size={20} className="text-primary-500 mr-2 animate-spin-slow" />
                     <h2 className="font-bold text-gray-900 dark:text-white">Expediente dos Colaboradores Ao Vivo</h2>
                   </div>
                   <button 
                     onClick={() => {
                       try {
                         const timeToMinutes = (timeStr: string): number => {
                           const [hours, minutes] = timeStr.split(':').map(Number);
                           return hours * 60 + minutes;
                         };

                         const headers = ['Data', 'Colaborador', 'Regime', 'Entrada', 'Saída', 'Pausas', 'Tempo Líquido (Segundos)', 'Tempo Líquido Formatado', 'Atraso (Minutos)', 'Almoço (Minutos)', 'Hora Extra'];
                         
                         const rows = allLogs.map(log => {
                           const member = teamMembers.find(m => m.uid === log.userId);
                           const isMemberAdminOrRH = member?.role === 'admin' || member?.roleId === 'admin' || member?.permissions?.includes('MANAGE_SETTINGS') || member?.permissions?.includes('MANAGE_TEAM');
                           const memberContract = isMemberAdminOrRH ? 'PJ' : (member?.contractType || 'PJ');

                           let csvLateMin = 0;
                           let csvLunchMin = 0;

                           if (memberContract === 'CLT') {
                             if (member?.workSchedule?.entryTime) {
                               const actualEntry = timeToMinutes(formatToBrasiliaTime(log.startTime, 'HH:mm'));
                               const plannedEntry = timeToMinutes(member.workSchedule.entryTime);
                               if (actualEntry > plannedEntry + 10) {
                                 csvLateMin = actualEntry - plannedEntry;
                               }
                             }
                             
                             log.pauses.forEach(p => {
                               if (p.type === 'lunch') {
                                 const pEnd = p.endTime || Date.now();
                                 csvLunchMin += Math.floor((pEnd - p.startTime) / 60000);
                               }
                             });
                           }

                           const netMs = log.totalDuration || calculateNetDuration(log.startTime, log.endTime, log.pauses);
                           const netSecs = Math.floor(netMs / 1000);
                           const hours = Math.floor(netSecs / 3600);
                           const mins = Math.floor((netSecs % 3600) / 60);
                           const formatted = `${hours}h ${mins}m`;
                           
                           const pausesStr = log.pauses.map(p => {
                             const pStart = formatToBrasiliaTime(p.startTime, 'HH:mm');
                             const pEnd = p.endTime ? formatToBrasiliaTime(p.endTime, 'HH:mm') : '...';
                             return `${p.type === 'lunch' ? 'Almoço' : p.type === 'meeting' ? 'Reunião' : 'Ausente'} (${pStart} - ${pEnd})`;
                           }).join(' | ');

                           return [
                             log.date,
                             log.userName,
                             memberContract,
                             formatToBrasiliaTime(log.startTime, 'HH:mm:ss'),
                             log.endTime ? formatToBrasiliaTime(log.endTime, 'HH:mm:ss') : 'Ativo',
                             pausesStr || 'Nenhuma',
                             netSecs,
                             formatted,
                             csvLateMin > 0 ? `${csvLateMin} min` : '—',
                             csvLunchMin > 0 ? `${csvLunchMin} min` : '—',
                             log.isOvertime ? 'Sim' : 'Não'
                           ];
                         });

                         const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                           + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
                         
                         const encodedUri = encodeURI(csvContent);
                         const link = document.createElement("a");
                         link.setAttribute("href", encodedUri);
                         link.setAttribute("download", `Espelho_Ponto_HubCRM_${new Date().getFullYear()}_${new Date().getMonth() + 1}.csv`);
                         document.body.appendChild(link);
                         link.click();
                         document.body.removeChild(link);
                         toast.success('Relatório de logs de ponto exportado com sucesso!');
                       } catch (e) {
                         console.error('Erro ao exportar logs de ponto:', e);
                         toast.error('Erro ao exportar logs.');
                       }
                     }}
                     className="flex items-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 text-primary-500 px-4 py-2.5 rounded-xl transition-all font-bold text-xs shadow-lg cursor-pointer"
                   >
                     <span>Exportar Logs Consolidados (CSV)</span>
                   </button>
                 </div>
                 <div className="divide-y divide-gray-200 dark:divide-white/10">
                   {teamMembers.map(member => {
                     const todayStr = getLocalDateString();
                     const log = allLogs.find(l => l.userId === member.uid && l.date === todayStr);
                     const elapsed = elapsedTimes[member.uid] || 0;
                     
                     const isMemberAdminOrRH = member.role === 'admin' || member.roleId === 'admin' || member.permissions?.includes('MANAGE_SETTINGS') || member.permissions?.includes('MANAGE_TEAM');
                     const memberContract = isMemberAdminOrRH ? 'PJ' : (member.contractType || 'PJ');

                     const timeToMinutes = (timeStr: string): number => {
                       const [hours, minutes] = timeStr.split(':').map(Number);
                       return hours * 60 + minutes;
                     };

                     let isLate = false;
                     let delayMinutes = 0;
                     let lunchMinutes = 0;
                     let isLunchExceeded = false;
                     const isOvertime = log ? !!log.isOvertime : false;

                     if (log && memberContract === 'CLT') {
                       if (member.workSchedule?.entryTime) {
                         const actualEntryMin = timeToMinutes(formatToBrasiliaTime(log.startTime, 'HH:mm'));
                         const plannedEntryMin = timeToMinutes(member.workSchedule.entryTime);
                         if (actualEntryMin > plannedEntryMin + 10) {
                           isLate = true;
                           delayMinutes = actualEntryMin - plannedEntryMin;
                         }
                       }
                       
                       log.pauses.forEach(p => {
                         if (p.type === 'lunch') {
                           const pEnd = p.endTime || Date.now();
                           lunchMinutes += Math.floor((pEnd - p.startTime) / 60000);
                         }
                       });
                       if (lunchMinutes > 60) {
                         isLunchExceeded = true;
                       }
                     }

                     const formatMs = (ms: number) => {
                       const totalSecs = Math.floor(ms / 1000);
                       const hours = Math.floor(totalSecs / 3600);
                       const minutes = Math.floor((totalSecs % 3600) / 60);
                       const seconds = totalSecs % 60;
                       return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                     };

                     return (
                       <div 
                         key={member.uid} 
                         onClick={() => setSelectedMemberForAttendance(member)}
                         className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors gap-4 cursor-pointer"
                       >
                         <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold overflow-hidden shadow-inner">
                             {member.photoURL ? <img src={member.photoURL} alt={member.displayName} /> : member.displayName?.[0] || 'U'}
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <p className="font-semibold text-gray-900 dark:text-white">{member.displayName}</p>
                               <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black tracking-wider uppercase ${
                                 memberContract === 'CLT'
                                   ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                   : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                               }`}>
                                 {memberContract}
                               </span>
                             </div>
                             <p className="text-xs text-gray-500">{member.jobTitle || 'Colaborador'}</p>
                           </div>
                         </div>
 
                         {/* Status do Ponto Ao Vivo */}
                         <div className="flex items-center gap-3">
                           <span className={`w-2.5 h-2.5 rounded-full ${
                             !log
                               ? 'bg-gray-400'
                               : log.status === 'active'
                               ? 'bg-emerald-500 animate-pulse'
                               : log.status === 'paused'
                               ? 'bg-amber-500'
                               : 'bg-rose-500'
                           }`} />
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                               {!log
                                 ? 'Offline'
                                 : log.status === 'active'
                                 ? 'Trabalhando Ao Vivo'
                                 : log.status === 'paused'
                                 ? (() => {
                                     const activePause = log.pauses.find(p => !p.endTime);
                                     if (activePause?.type === 'lunch') return '🍱 Em Almoço';
                                     if (activePause?.type === 'meeting') return '👥 Em Reunião';
                                     return '🕒 Ausente';
                                   })()
                                 : 'Expediente Encerrado'}
                             </span>
                             <span className="text-[10px] text-gray-500 font-mono">
                               {log ? `Entrada: ${formatToBrasiliaTime(log.startTime, 'HH:mm:ss')}` : 'Sem registros hoje'}
                             </span>
                             
                             <div className="flex flex-wrap gap-1 mt-1">
                               {isLate && (
                                 <span className="text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                   ⚠️ Atraso ({delayMinutes}m)
                                 </span>
                               )}
                               {isLunchExceeded && (
                                 <span className="text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                   🍱 Almoço Longo ({lunchMinutes}m)
                                 </span>
                               )}
                               {isOvertime && (
                                 <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                   ⚡ Hora Extra
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
 
                         {/* Contador de Tempo dinâmico */}
                         <div className="flex flex-col items-end text-right">
                           <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Tempo Líquido Hoje</p>
                           <p className={`text-sm font-bold font-mono ${
                             log?.status === 'active' 
                               ? 'text-emerald-500' 
                               : log?.status === 'paused' 
                               ? 'text-amber-500' 
                               : 'text-gray-500'
                           }`}>
                             {log ? formatMs(elapsed) : '00:00:00'}
                           </p>
                         </div>
                       </div>
                     );
                   })}
                   {teamMembers.length === 0 && (
                     <div className="p-12 text-center opacity-30 italic">Nenhum membro ativo cadastrado.</div>
                   )}
                 </div>
               </div>
             </div>
           )}      </div>
              </div>
            </div>
          )}

          {activeTab === 'climate' && isAdminOrGerente && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div>
                     <h3 className="font-bold mb-6 flex items-center gap-2"><Settings size={18} /> Configurar eNPS</h3>
                     <div className="space-y-4">
                        <textarea value={enpsQuestion} onChange={e => setEnpsQuestion(e.target.value)} className="w-full h-24 bg-white/5 border border-white/10 p-4 rounded-2xl text-sm" placeholder="Pergunta da pesquisa..." />
                        <select value={enpsFrequency} onChange={e => setEnpsFrequency(e.target.value as any)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm">
                           <option value="mensal">Mensal</option>
                           <option value="trimestral">Trimestral</option>
                        </select>
                        <button onClick={async () => { if(!effectiveOrgId) return; await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { enpsQuestion, enpsFrequency }, { merge: true }); toast.success('Salvo!'); }} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold">Salvar</button>
                     </div>
                  </div>
                  <div>
                     <h3 className="font-bold mb-6 flex items-center gap-2"><MessageSquare size={18} /> Feedbacks Anônimos</h3>
                     <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {enpsResults.filter(r => r.comment).map(r => (
                          <div key={r.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                             <div className="flex justify-between mb-2"><span className="text-xs font-bold text-primary-500">Nota: {r.score}</span></div>
                             <p className="text-sm italic">"{r.comment}"</p>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

         {selectedMemberForAttendance && (() => {
           const member = selectedMemberForAttendance;
           const isMemberAdminOrRH = member.role === 'admin' || member.roleId === 'admin' || member.permissions?.includes('MANAGE_SETTINGS') || member.permissions?.includes('MANAGE_TEAM');
           const memberContract = isMemberAdminOrRH ? 'PJ' : (member.contractType || 'PJ');

           const memberLogs = allLogs.filter(l => l.userId === member.uid);
           memberLogs.sort((a, b) => b.startTime - a.startTime);

           const todayStr = getLocalDateString();
           const todayLog = memberLogs.find(l => l.date === todayStr);

           const formatMs = (ms: number) => {
             const totalSecs = Math.floor(ms / 1000);
             const hours = Math.floor(totalSecs / 3600);
             const minutes = Math.floor((totalSecs % 3600) / 60);
             const seconds = totalSecs % 60;
             return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
           };

           const formatMsToHours = (ms: number) => {
             const totalSecs = Math.floor(ms / 1000);
             const hours = Math.floor(totalSecs / 3600);
             const minutes = Math.floor((totalSecs % 3600) / 60);
             return `${hours}h ${minutes}m`;
           };

           const totalMsMonth = memberLogs.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);

           // Calcula a média das pausas de almoço
           let totalLunchMinutes = 0;
           let lunchCount = 0;
           memberLogs.forEach(l => {
             let dayLunch = 0;
             l.pauses.forEach(p => {
               if (p.type === 'lunch') {
                 const end = p.endTime || Date.now();
                 dayLunch += (end - p.startTime);
               }
             });
             if (dayLunch > 0) {
               totalLunchMinutes += Math.floor(dayLunch / 60000);
               lunchCount++;
             }
           });

           return (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setSelectedMemberForAttendance(null)}>
               <div className="bg-[#0f1117] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in scale-in duration-300" onClick={e => e.stopPropagation()}>
                 {/* Header */}
                 <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                   <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold overflow-hidden border border-primary-500/30 shadow-inner">
                       {member.photoURL ? <img src={member.photoURL} alt={member.displayName} /> : member.displayName?.[0] || 'U'}
                     </div>
                     <div className="text-left">
                       <div className="flex items-center gap-2">
                         <h3 className="text-xl font-bold text-white">{member.displayName}</h3>
                         <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black tracking-wider uppercase ${
                           memberContract === 'CLT'
                             ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                             : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                         }`}>
                           {memberContract}
                         </span>
                       </div>
                       <p className="text-xs text-gray-400">{member.jobTitle || 'Colaborador'}</p>
                     </div>
                   </div>
                   <button onClick={() => setSelectedMemberForAttendance(null)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-gray-400 hover:text-white transition-all"><X size={18} /></button>
                 </div>

                 {/* Modal Content */}
                 <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                   {/* Grid Informativa */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                     {/* Card 1: Hoje */}
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col justify-between min-h-[140px]">
                       <div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Tempo Hoje</span>
                         <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                           {todayLog ? formatMs(elapsedTimes[member.uid] || todayLog.totalDuration) : '00:00:00'}
                         </h3>
                       </div>
                       <div className="flex items-center gap-2 mt-4">
                         <span className={`w-2.5 h-2.5 rounded-full ${
                           !todayLog
                             ? 'bg-gray-500'
                             : todayLog.status === 'active'
                             ? 'bg-emerald-500 animate-pulse'
                             : todayLog.status === 'paused'
                             ? 'bg-amber-500'
                             : 'bg-rose-500'
                         }`} />
                         <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                           {!todayLog ? 'Offline' : todayLog.status === 'active' ? 'Ativo' : todayLog.status === 'paused' ? 'Intervalo' : 'Concluído'}
                         </span>
                       </div>
                     </div>

                     {/* Card 2: Mês */}
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col justify-between min-h-[140px]">
                       <div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Acumulado (Mês)</span>
                         <h3 className="text-3xl font-black font-mono tracking-tight text-primary-500">
                           {formatMsToHours(totalMsMonth)}
                         </h3>
                       </div>
                       <p className="text-[11px] text-gray-400">Tempo total consolidado produtivo.</p>
                     </div>

                     {/* Card 3: Almoço / Jornada */}
                     <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col justify-between min-h-[140px]">
                       <div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Regime & Expediente</span>
                         <h3 className="text-xl font-bold text-white tracking-tight leading-tight mt-1">
                           {memberContract === 'CLT' && member.workSchedule 
                             ? `${member.workSchedule.entryTime} - ${member.workSchedule.exitTime}`
                             : 'Horário Livre (PJ)'}
                         </h3>
                       </div>
                       <p className="text-[11px] text-gray-400">
                         {memberContract === 'CLT' && lunchCount > 0
                           ? `Média de almoço: ${Math.round(totalLunchMinutes / lunchCount)} min`
                           : 'Sem restrições de horários.'}
                       </p>
                     </div>
                   </div>

                   {/* Gráfico de Horas Semanais */}
                   <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 text-left">
                     <h3 className="font-bold flex items-center gap-2 mb-6 text-white text-sm uppercase tracking-wider"><TrendingUp size={16} className="text-primary-500" /> Histórico Semanal de Produção</h3>
                     <div className="h-48 flex items-end gap-6 pt-6 px-4 border-b border-white/5">
                       {(() => {
                         const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                         const logsByDay = new Array(7).fill(0);
                         
                         const now = new Date();
                         const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Domingo
                         
                         memberLogs.forEach(log => {
                           const logDate = parseISO(log.date);
                           const diff = Math.floor((logDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
                           if (diff >= 0 && diff < 7) {
                             logsByDay[diff] = log.totalDuration;
                           }
                         });

                         const maxDuration = Math.max(...logsByDay, 1000 * 60 * 60 * 8);

                         return logsByDay.map((duration, idx) => {
                           const percentage = Math.min((duration / maxDuration) * 100, 100);
                           const hours = (duration / (1000 * 60 * 60)).toFixed(1);
                           return (
                             <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative text-center">
                               <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-all font-mono pointer-events-none z-20 shrink-0">
                                 {hours}h
                               </div>
                               <div 
                                 style={{ height: `${percentage}%` }}
                                 className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                                   duration === 0 
                                     ? 'bg-white/5' 
                                     : idx === new Date().getDay()
                                     ? 'bg-gradient-to-t from-primary-600 to-primary-400 shadow-lg'
                                     : 'bg-white/10 hover:bg-white/20'
                                 }`}
                               />
                               <span className="text-[10px] text-gray-500 font-medium mt-1">{daysOfWeek[idx]}</span>
                             </div>
                           );
                         });
                       })()}
                     </div>
                   </div>

                   {/* Tabela Detalhada do Espelho de Ponto */}
                   <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 text-left">
                     <h3 className="font-bold flex items-center gap-2 mb-6 text-white text-sm uppercase tracking-wider"><Clock size={16} className="text-pink-500" /> Registro Completo de Presenças</h3>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                         <thead>
                           <tr className="border-b border-white/5 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                             <th className="py-3 px-2">Data</th>
                             <th className="py-3 px-2">Entrada</th>
                             <th className="py-3 px-2">Saída</th>
                             <th className="py-3 px-2">Intervalos/Pausas</th>
                             <th className="py-3 px-2">Indicadores</th>
                             <th className="py-3 px-2">Tempo Líquido</th>
                           </tr>
                         </thead>
                         <tbody className="text-sm">
                           {memberLogs.map(l => {
                             const lIsOvertime = !!l.isOvertime;
                             let lIsLate = false;
                             let lLateMinutes = 0;
                             let lLunchMinutes = 0;
                             let lIsLunchExceeded = false;

                             if (memberContract === 'CLT') {
                               if (member.workSchedule?.entryTime) {
                                 const actEntry = timeToMinutes(formatToBrasiliaTime(l.startTime, 'HH:mm'));
                                 const planEntry = timeToMinutes(member.workSchedule.entryTime);
                                 if (actEntry > planEntry + 10) {
                                   lIsLate = true;
                                   lLateMinutes = actEntry - planEntry;
                                 }
                               }
                               
                               l.pauses.forEach(p => {
                                 if (p.type === 'lunch') {
                                   const pEnd = p.endTime || Date.now();
                                   lLunchMinutes += Math.floor((pEnd - p.startTime) / 60000);
                                 }
                               });
                               if (lLunchMinutes > 60) {
                                 lIsLunchExceeded = true;
                               }
                             }

                             return (
                               <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                 <td className="py-4 px-2 font-bold text-gray-300">{formatLocalDateStr(l.date)}</td>
                                 <td className="py-4 px-2 font-mono text-gray-400">{formatToBrasiliaTime(l.startTime, 'HH:mm:ss')}</td>
                                 <td className="py-4 px-2 font-mono text-gray-400">
                                   {l.endTime ? formatToBrasiliaTime(l.endTime, 'HH:mm:ss') : <span className="text-emerald-500 font-bold">Ativo</span>}
                                 </td>
                                 <td className="py-4 px-2">
                                   {l.pauses.length > 0 ? (
                                     <div className="flex flex-wrap gap-1 font-mono">
                                       {l.pauses.map((p, pIdx) => (
                                         <span key={pIdx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                                           {p.type === 'lunch' ? '🍱 Almoço' : p.type === 'meeting' ? '👥 Reunião' : '🕒 Ausente'}:{' '}
                                           {formatToBrasiliaTime(p.startTime, 'HH:mm')} - {p.endTime ? formatToBrasiliaTime(p.endTime, 'HH:mm') : '...'}
                                         </span>
                                       ))}
                                     </div>
                                   ) : (
                                     <span className="text-xs text-gray-500 italic">Sem pausas</span>
                                   )}
                                 </td>
                                 <td className="py-4 px-2">
                                   <div className="flex flex-wrap gap-1">
                                     {lIsLate && (
                                       <span className="text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">
                                         Atraso ({lLateMinutes}m)
                                       </span>
                                     )}
                                     {lIsLunchExceeded && (
                                       <span className="text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded">
                                         Almoço Longo ({lLunchMinutes}m)
                                       </span>
                                     )}
                                     {lIsOvertime && (
                                       <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">
                                         Hora Extra
                                       </span>
                                     )}
                                   </div>
                                 </td>
                                 <td className="py-4 px-2 font-mono font-bold text-primary-500">
                                   {formatDuration(l.totalDuration || calculateNetDuration(l.startTime, l.endTime, l.pauses))}
                                 </td>
                               </tr>
                             );
                           })}
                           {memberLogs.length === 0 && (
                             <tr>
                               <td colSpan={6} className="py-12 text-center opacity-30 italic text-sm">Sem registros este mês.</td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           );
         })()}

        {showVacationModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 w-full max-w-lg">
                 <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Nova Solicitação</h3><button onClick={() => setShowVacationModal(false)}><X /></button></div>
                 <form onSubmit={handleAddVacation} className="space-y-4">
                    <select required className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl" value={newVacation.userId || ''} onChange={e => setNewVacation({...newVacation, userId: e.target.value})}><option value="">Membro...</option>{teamProfiles.map(p => <option key={p.uid} value={p.uid}>{p.displayName}</option>)}</select>
                    <select required className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl" value={newVacation.reason || ''} onChange={e => setNewVacation({...newVacation, reason: e.target.value as any, status: 'Pendente', type: e.target.value === 'Férias' ? 'Férias' : 'Ausência'})}><option value="">Motivo...</option><option value="Férias">Férias</option><option value="Motivo Médico">Médico</option><option value="Licença Maternidade/Paternidade">Licença Maternidade/Paternidade</option><option value="Outro">Outro/Folga</option></select>
                    <textarea required placeholder="Descreva o motivo detalhado..." className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl h-32 text-sm" value={newVacation.description || ''} onChange={e => setNewVacation({...newVacation, description: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4"><input type="date" className="p-4 rounded-xl bg-gray-100 dark:bg-white/5" value={newVacation.start} onChange={e => setNewVacation({...newVacation, start: e.target.value})} /><input type="date" className="p-4 rounded-xl bg-gray-100 dark:bg-white/5" value={newVacation.end} onChange={e => setNewVacation({...newVacation, end: e.target.value})} /></div>
                    <button className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold">Enviar Solicitação</button>
                 </form>
              </div>
           </div>
        )}

        {showRejectionModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-white/5">
                 <div className="flex justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       <AlertTriangle className="text-amber-500" size={20} /> Justificar Recusa
                    </h3>
                    <button onClick={() => setShowRejectionModal(false)}><X /></button>
                 </div>
                 <p className="text-xs text-gray-400 mb-4 italic">Informe o motivo para que o colaborador saiba por que a solicitação não foi aprovada.</p>
                 <textarea 
                    required 
                    placeholder="Ex: Equipe reduzida no período ou necessidade de escala..." 
                    className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl h-32 text-sm focus:ring-2 ring-primary-500 transition-all outline-none" 
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)} 
                 />
                 <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowRejectionModal(false)} className="flex-1 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">Cancelar</button>
                    <button 
                       onClick={handleConfirmRejection} 
                       disabled={!rejectionReason.trim()}
                       className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                       Confirmar Recusa
                    </button>
                 </div>
              </div>
           </div>
        )}

        {showDeleteConfirm && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 text-center max-w-sm">
                 <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                 <h3 className="font-bold mb-2">Excluir?</h3>
                 <div className="flex gap-2 mt-6"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border border-white/10 rounded-xl">Não</button><button onClick={confirmDeleteVacation} className="flex-1 py-3 bg-red-500 text-white rounded-xl">Sim</button></div>
              </div>
           </div>
        )}

        {showMilestoneModal && (
          <AddMilestoneModal 
            isOpen={showMilestoneModal}
            onClose={() => setShowMilestoneModal(false)} 
            targetUserId={selectedMember?.uid || ''}
            onSuccess={() => { setShowMilestoneModal(false); toast.success('Adicionado!'); }}
          />
        )}

        {showSkillsModal && selectedMember && (
          <EditSkillsModal
            isOpen={showSkillsModal}
            onClose={() => setShowSkillsModal(false)}
            targetUserId={selectedMember.uid}
            initialSkills={selectedMember.skills || { hard: [], soft: [] }}
            onSuccess={() => { setShowSkillsModal(false); toast.success('Matriz atualizada!'); }}
          />
        )}
      </div>
    </div>
  );
}
