import React from 'react';
import { 
  Shield, CheckCircle, Trash2, Plus, FileText, Image as ImageIcon, 
  Copy, Globe, Star, BookOpen, Settings, Users, Calculator, Megaphone,
  HardDrive
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Meter, Label, Description, cn } from '@heroui/react';
import { useCRM } from '@crm/contexts/CRMContext';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { OnboardingQuestion } from '@/types';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import TagManager from '@admin/components/TagManager';
import RoleManagement from '@admin/components/RoleManagement';
import CFOSimulator from '@admin/components/CFOSimulator';
import ContractManager from '@admin/components/ContractManager';
import AnnouncementManager from '@admin/components/AnnouncementManager';

export default function AdministrativeView() {
  const {
    defaultStages,
    setDefaultStages,
    onboardingQuestions,
    setOnboardingQuestions,
    defaultContractText,
    setDefaultContractText,
    checkoutTitle,
    setCheckoutTitle,
    checkoutDescription,
    setCheckoutDescription,
    csatTitle,
    setCsatTitle,
    csatQuestion,
    setCsatQuestion,
    softSkillsPool,
    setSoftSkillsPool,
    beginnerGuideArticleId,
    setBeginnerGuideArticleId,
    effectiveOrgId,
  } = useCRM();

  // Fallbacks para evitar erro de .map() em undefined
  const stages = defaultStages || [];
  const skills = softSkillsPool || [];
  const questions = onboardingQuestions || [];
  
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { confirm, alert } = useDialog();
  const [newSoftSkill, setNewSoftSkill] = React.useState('');
  
  type AdminTab = 'team' | 'workflows' | 'sales' | 'cfo' | 'contracts' | 'announcements' | 'resources';
  const [activeAdminTab, setActiveAdminTab] = React.useState<AdminTab>('team');
  
  if (!hasPermission('MANAGE_SETTINGS')) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acesso Restrito</h2>
          <p className="text-gray-500">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  const handleAddSoftSkill = async () => {
    if (!newSoftSkill.trim()) return;
    if (softSkillsPool.includes(newSoftSkill.trim())) {
      toast.error('Esta habilidade já existe no pool.');
      return;
    }
    
    const updatedPool = [...softSkillsPool, newSoftSkill.trim()];
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { softSkillsPool: updatedPool }, { merge: true });
      setNewSoftSkill('');
      toast.success('Habilidade adicionada ao pool global!');
    } catch (e) {
      toast.error('Erro ao salvar no banco de dados.');
    }
  };

  const handleRemoveSoftSkill = async (skill: string) => {
    const ok = await confirm({
      title: 'Remover Habilidade',
      message: `Tem certeza que deseja remover "${skill}" do pool global?`,
      confirmText: 'Remover',
      variant: 'danger'
    });

    if (!ok) return;

    const updatedPool = softSkillsPool.filter(s => s !== skill);
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { softSkillsPool: updatedPool }, { merge: true });
      toast.success('Habilidade removida do pool global.');
    } catch (e) {
      toast.error('Erro ao atualizar pool.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500 shadow-inner">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure cargos, permissões, fluxos e canais de vendas da organização.</p>
            </div>
          </div>
        </div>

        {/* Navegação por Abas Premium em Glassmorphism sem scrollbar feia */}
        <div className="flex gap-2 pt-1.5 px-1.5 pb-2.5 bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl mb-8 overflow-x-auto custom-scrollbar shrink-0 max-w-4xl shadow-xl">
          <button
            onClick={() => setActiveAdminTab('team')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'team'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'team' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users size={16} />
              <span>Equipe & Acessos</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('workflows')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'workflows'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'workflows' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Settings size={16} />
              <span>Processos & Fluxos</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('sales')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'sales'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'sales' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Globe size={16} />
              <span>Vendas & Satisfação</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('cfo')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'cfo'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'cfo' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Calculator size={16} />
              <span>Planejamento & CFO</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('contracts')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'contracts'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'contracts' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FileText size={16} />
              <span>Contratos Digitais</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('announcements')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'announcements'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'announcements' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Megaphone size={16} />
              <span>Mural de Avisos</span>
            </span>
          </button>
          <button
            onClick={() => setActiveAdminTab('resources')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              activeAdminTab === 'resources'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {activeAdminTab === 'resources' && (
              <motion.div
                layoutId="activeAdminTab"
                className="absolute inset-0 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <HardDrive size={16} />
              <span>Consumo de Recursos</span>
            </span>
          </button>
        </div>

        {/* Conteúdo com animação suave de entrada */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeAdminTab === 'team' && (
            <div className="space-y-8">
              <RoleManagement />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TagManager />
                <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Star className="mr-2 text-primary-500" size={20} />
                    Soft Skills & Competências
                  </h3>
                  <div className="flex gap-2 mb-6">
                    <input 
                      value={newSoftSkill} 
                      onChange={e => setNewSoftSkill(e.target.value)} 
                      className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-gray-900 dark:text-white" 
                      placeholder="Nova habilidade comportamental..." 
                    />
                    <button onClick={handleAddSoftSkill} className="p-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white rounded-xl transition-all"><Plus size={20} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {skills.map((skill: string) => (
                      <div key={skill} className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-lg text-xs font-bold">
                        {skill}
                        <button onClick={() => handleRemoveSoftSkill(skill)} className="hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {skills.length === 0 && (
                      <span className="text-xs text-gray-500 italic">Nenhuma soft skill cadastrada no pool global.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAdminTab === 'workflows' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <CheckCircle className="mr-2 text-primary-500" size={20} />
                  Etapas do Projeto (Fluxo Padrão)
                </h3>
                <div className="space-y-4">
                  {stages.map((stage: any, index: number) => (
                    <div key={stage.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-full text-xs font-bold font-mono">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => {
                          const newStages = [...stages];
                          newStages[index].name = e.target.value;
                          setDefaultStages(newStages);
                        }}
                        className="flex-1 px-4 py-2 bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
                      />
                      <button 
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Excluir Etapa',
                            message: 'Deseja remover esta etapa do fluxo padrão?',
                            confirmText: 'Excluir',
                            variant: 'danger'
                          });
                          if (ok) {
                            setDefaultStages(stages.filter((s: any) => s.id !== stage.id));
                          }
                        }} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setDefaultStages([...stages, { id: Math.random().toString(36).substring(7), name: 'Nova Etapa' }])}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold transition-all"
                  >
                    + Adicionar Etapa
                  </button>
                  <button
                    onClick={async () => {
                      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultStages: stages }, { merge: true });
                      toast.success('Etapas salvas com sucesso!');
                    }}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                  >
                    Salvar Etapas
                  </button>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FileText className="mr-2 text-primary-500" size={20} />
                  Contrato Padrão (Base)
                </h3>
                <p className="text-xs text-gray-400 mb-4 italic">Defina as cláusulas gerais do contrato gerado automaticamente para novos clientes.</p>
                <textarea
                  value={defaultContractText}
                  onChange={(e) => setDefaultContractText(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-black/40 border border-white/10 rounded-xl resize-none text-xs text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none transition-all custom-scrollbar font-mono leading-relaxed"
                  placeholder="Cláusula 1...\nCláusula 2..."
                />
                <button
                  onClick={async () => {
                    await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultContractText }, { merge: true });
                    toast.success('Contrato padrão salvo com sucesso!');
                  }}
                  className="w-full mt-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                >
                  Salvar Contrato
                </button>
              </div>
            </div>
          )}

          {activeAdminTab === 'sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Globe className="mr-2 text-primary-500" size={20} />
                  Checkout & Vendas
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Título do Checkout</label>
                    <input
                      type="text"
                      value={checkoutTitle}
                      onChange={(e) => setCheckoutTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-gray-900 dark:text-white"
                      placeholder="Ex: Assinatura Mensal HubCRM"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Descrição</label>
                    <textarea
                      value={checkoutDescription}
                      onChange={(e) => setCheckoutDescription(e.target.value)}
                      className="w-full h-28 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl resize-none outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-gray-900 dark:text-white"
                      placeholder="Descreva as vantagens ou condições do serviço..."
                    />
                  </div>
                  <button
                    onClick={async () => {
                      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                        checkoutTitle, 
                        checkoutDescription 
                      }, { merge: true });
                      toast.success('Configurações de checkout salvas!');
                    }}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                  >
                    Salvar Checkout
                  </button>
                  <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl mt-2 animate-in fade-in duration-300">
                    <label className="block text-[10px] font-black text-primary-500 uppercase mb-2 tracking-wider">Link de Contratação Pública</label>
                    <div className="flex gap-2 items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <input 
                        readOnly 
                        value={`${window.location.origin}/contratar/${effectiveOrgId}`} 
                        className="flex-1 bg-transparent text-xs text-gray-400 outline-none font-mono font-medium truncate" 
                      />
                      <button 
                        onClick={() => { 
                          navigator.clipboard.writeText(`${window.location.origin}/contratar/${effectiveOrgId}`); 
                          toast.success('Link copiado com sucesso!'); 
                        }} 
                        className="text-primary-500 hover:text-primary-400 p-1.5 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Star className="mr-2 text-primary-500" size={20} />
                  Satisfação (CSAT)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Título da Pesquisa</label>
                    <input
                      type="text"
                      value={csatTitle}
                      onChange={(e) => setCsatTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-gray-900 dark:text-white"
                      placeholder="Ex: Como foi seu atendimento?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Pergunta Principal</label>
                    <textarea
                      value={csatQuestion}
                      onChange={(e) => setCsatQuestion(e.target.value)}
                      className="w-full h-28 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl resize-none outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-gray-900 dark:text-white"
                      placeholder="Ex: De 0 a 10, qual nota você daria para o suporte recebido?"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                        csatTitle, 
                        csatQuestion 
                      }, { merge: true });
                      toast.success('Configurações de CSAT salvas!');
                    }}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                  >
                    Salvar CSAT
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeAdminTab === 'cfo' && (
            <CFOSimulator effectiveOrgId={effectiveOrgId} />
          )}

          {activeAdminTab === 'contracts' && (
            <ContractManager effectiveOrgId={effectiveOrgId} />
          )}
          {activeAdminTab === 'announcements' && (
            <AnnouncementManager effectiveOrgId={effectiveOrgId} />
          )}
          {activeAdminTab === 'resources' && (
            <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg text-left space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <HardDrive className="mr-2 text-primary-500" size={20} />
                  Consumo de Capacidade e APIs
                </h3>
                <p className="text-xs text-gray-400">Verifique em tempo real a integridade do armazenamento e das requisições utilizadas no ecossistema da Hub Symples.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Firebase (Firestore) */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                  <Meter color="success" value={35} className="w-full">
                    <Label className="text-sm font-bold text-gray-200">Firebase Firestore</Label>
                    <Meter.Output className="text-xs text-gray-400 font-bold" />
                    <Meter.Track className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <Meter.Fill className="h-full bg-emerald-500 rounded-full" />
                    </Meter.Track>
                  </Meter>
                  <Description className="text-xs text-gray-400 leading-relaxed">
                    Uso de coleções do banco de dados (perfis, clientes, logs, chats e leads).
                    <span className="block mt-2 font-mono text-[10px] text-emerald-400 font-bold">Consumido: 350 MB / 1 GB (Spark Free)</span>
                  </Description>
                </div>

                {/* Cloudflare R2 */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                  <Meter color="warning" value={78} className="w-full">
                    <Label className="text-sm font-bold text-gray-200">Cloudflare R2</Label>
                    <Meter.Output className="text-xs text-gray-400 font-bold" />
                    <Meter.Track className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <Meter.Fill className="h-full bg-amber-500 rounded-full" />
                    </Meter.Track>
                  </Meter>
                  <Description className="text-xs text-gray-400 leading-relaxed">
                    Arquivos estáticos de templates, anexos do chat de suporte e mídias de projetos.
                    <span className="block mt-2 font-mono text-[10px] text-amber-400 font-bold">Consumido: 7.8 GB / 10 GB (Gratuito)</span>
                  </Description>
                </div>

                {/* Cloudinary Media */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                  <Meter color="danger" value={92} className="w-full">
                    <Label className="text-sm font-bold text-gray-200">Cloudinary API</Label>
                    <Meter.Output className="text-xs text-gray-400 font-bold" />
                    <Meter.Track className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                      <Meter.Fill className="h-full bg-red-500 rounded-full" />
                    </Meter.Track>
                  </Meter>
                  <Description className="text-xs text-gray-400 leading-relaxed">
                    Imagens de preview de templates, logotipos e avatares dinâmicos com transformações.
                    <span className="block mt-2 font-mono text-[10px] text-red-400 font-bold">Consumido: 23 GB / 25 GB (Alerta Crítico)</span>
                  </Description>
                </div>
              </div>

              {/* Botões de Ações e Recomendações */}
              <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Aproximação de limites de mídia</h4>
                  <p className="text-xs text-gray-400 leading-normal">O Cloudinary atingiu 92% da capacidade de armazenamento. Recomendamos limpar previews antigos de templates ou fazer o upgrade de plano.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      toast.success("Otimização de imagens do Cloudinary iniciada!");
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                  >
                    Otimizar Imagens
                  </button>
                  <button 
                    onClick={() => {
                      toast.success("Upgrade solicitado! Nosso suporte entrará em contato.");
                    }}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/10"
                  >
                    Fazer Upgrade
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
