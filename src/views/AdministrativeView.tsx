import React from 'react';
import { 
  Shield, CheckCircle, Trash2, Plus, FileText, Image as ImageIcon, 
  Copy, Globe, Star, BookOpen, Settings 
} from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { OnboardingQuestion } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import TagManager from '../components/settings/TagManager';
import RoleManagement from '../components/settings/RoleManagement';

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

  const { alert, confirm } = useDialog();
  const [newSoftSkill, setNewSoftSkill] = React.useState('');
  
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
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500">
            <Shield size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie cargos, permissões e fluxos globais do sistema.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2">
                <RoleManagement />
            </div>

            <div className="space-y-8">
                <TagManager />
                
                <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <CheckCircle className="mr-2 text-primary-500" size={20} />
                        Etapas do Projeto
                    </h3>
                    <div className="space-y-4">
                        {defaultStages.map((stage, index) => (
                            <div key={stage.id} className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={stage.name}
                                    onChange={(e) => {
                                        const newStages = [...defaultStages];
                                        newStages[index].name = e.target.value;
                                        setDefaultStages(newStages);
                                    }}
                                    className="flex-1 px-4 py-2 bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl outline-none"
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
                                            setDefaultStages(defaultStages.filter(s => s.id !== stage.id));
                                        }
                                    }} 
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => setDefaultStages([...defaultStages, { id: Math.random().toString(36).substring(7), name: 'Nova Etapa' }])}
                            className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-sm"
                        >
                            + Adicionar Etapa
                        </button>
                        <button
                            onClick={async () => {
                                await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultStages }, { merge: true });
                                toast.success('Etapas salvas!');
                            }}
                            className="w-full py-2 bg-primary-500 text-white rounded-xl font-bold"
                        >
                            Salvar Etapas
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Globe className="mr-2 text-primary-500" size={20} />
                        Checkout & Vendas
                    </h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={checkoutTitle}
                            onChange={(e) => setCheckoutTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl"
                            placeholder="Título do Checkout"
                        />
                        <textarea
                            value={checkoutDescription}
                            onChange={(e) => setCheckoutDescription(e.target.value)}
                            className="w-full h-24 px-4 py-2 bg-black/40 border border-white/10 rounded-xl resize-none"
                            placeholder="Descrição"
                        />
                        <button
                            onClick={async () => {
                                await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                                    checkoutTitle, 
                                    checkoutDescription 
                                }, { merge: true });
                                toast.success('Configurações de checkout salvas!');
                            }}
                            className="w-full py-2 bg-primary-500 text-white rounded-xl font-bold"
                        >
                            Salvar Checkout
                        </button>
                         <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl">
                            <label className="block text-xs font-bold text-primary-500 uppercase mb-2">Link público</label>
                            <div className="flex gap-2">
                                <input readOnly value={`${window.location.origin}/contratar/${effectiveOrgId}`} className="flex-1 bg-transparent text-xs text-gray-400 outline-none" />
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/contratar/${effectiveOrgId}`); toast.success('Link copiado!'); }} className="text-primary-500"><Copy size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Star className="mr-2 text-primary-500" size={20} />
                        Satisfação (CSAT)
                    </h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={csatTitle}
                            onChange={(e) => setCsatTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl"
                            placeholder="Título da Pesquisa"
                        />
                        <textarea
                            value={csatQuestion}
                            onChange={(e) => setCsatQuestion(e.target.value)}
                            className="w-full h-24 px-4 py-2 bg-black/40 border border-white/10 rounded-xl resize-none"
                            placeholder="Pergunta de satisfação"
                        />
                        <button
                            onClick={async () => {
                                await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                                    csatTitle, 
                                    csatQuestion 
                                }, { merge: true });
                                toast.success('Configurações de CSAT salvas!');
                            }}
                            className="w-full py-2 bg-primary-500 text-white rounded-xl font-bold"
                        >
                            Salvar CSAT
                        </button>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <FileText className="mr-2 text-primary-500" size={20} />
                        Contrato Padrão
                    </h3>
                    <textarea
                        value={defaultContractText}
                        onChange={(e) => setDefaultContractText(e.target.value)}
                        className="w-full h-48 px-4 py-2 bg-black/40 border border-white/10 rounded-xl resize-none text-xs custom-scrollbar"
                    />
                    <button
                        onClick={async () => {
                            await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultContractText }, { merge: true });
                            toast.success('Contrato salvo!');
                        }}
                        className="w-full mt-4 py-2 bg-primary-500 text-white rounded-xl font-bold"
                    >
                        Salvar Contrato
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Star className="mr-2 text-primary-500" size={20} />
                        Soft Skills & Competências
                    </h3>
                    <div className="flex gap-2 mb-6">
                        <input value={newSoftSkill} onChange={e => setNewSoftSkill(e.target.value)} className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-xl" placeholder="Nova habilidade..." />
                        <button onClick={handleAddSoftSkill} className="p-2 bg-primary-500 text-white rounded-xl"><Plus size={20} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {softSkillsPool.map(skill => (
                            <div key={skill} className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-lg text-xs font-bold">
                                {skill}
                                <button onClick={() => handleRemoveSoftSkill(skill)}><Trash2 size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-black/20 border border-gray-200 dark:border-white/10 rounded-3xl p-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <BookOpen className="mr-2 text-primary-500" size={20} />
                        Wiki Hub - Boas Vindas
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={beginnerGuideArticleId}
                            onChange={(e) => setBeginnerGuideArticleId(e.target.value)}
                            className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-xl"
                            placeholder="ID do artigo..."
                        />
                        <button
                            onClick={async () => {
                                await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { beginnerGuideArticleId }, { merge: true });
                                toast.success('ID da Wiki salvo!');
                            }}
                            className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
