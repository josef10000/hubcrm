import React from 'react';
import { Settings, CheckCircle, Trash2, Plus, FileText, Image as ImageIcon, LogOut, Copy, Globe, Star, BookOpen } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { useUI } from '../contexts/UIContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { OnboardingQuestion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TagManager from '../components/settings/TagManager';

export default function SettingsView() {
  const { themeColor, setThemeColor } = useUI();
  const {
    churnRiskDays,
    setChurnRiskDays,
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
  const { userProfile } = useAuth();
  
  const [newSoftSkill, setNewSoftSkill] = React.useState('');

  const isAdminOrGerente = userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente';

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
    const updatedPool = softSkillsPool.filter(s => s !== skill);
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { softSkillsPool: updatedPool }, { merge: true });
      toast.success('Habilidade removida do pool global.');
    } catch (e) {
      toast.error('Erro ao atualizar pool.');
    }
  };

  const themes = [
    { id: 'orange', name: 'Laranja (Original)', color: 'bg-[#f97316]' },
    { id: 'blue', name: 'Azul', color: 'bg-[#3b82f6]' },
    { id: 'green', name: 'Verde', color: 'bg-[#22c55e]' },
    { id: 'purple', name: 'Roxo', color: 'bg-[#a855f7]' },
    { id: 'rose', name: 'Rosa', color: 'bg-[#f43f5e]' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Configurações</h2>

        <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Settings className="mr-2 text-primary-500" size={20} />
            Aparência
          </h3>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">Risco de Cancelamento (Churn)</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dias de atraso na fatura para alertar risco</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={churnRiskDays}
                  onChange={(e) => setChurnRiskDays(parseInt(e.target.value) || 15)}
                  className="w-20 px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">dias</span>
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 w-full"></div>

            <div>
              <h4 className="text-gray-900 dark:text-white font-medium mb-3">Cor de Destaque</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Escolha a cor principal do sistema</p>
              <div className="flex flex-wrap gap-4">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeColor(t.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${themeColor === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-4 h-4 rounded-full ${t.color}`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isAdminOrGerente && (
          <div className="mb-8">
            <TagManager />
          </div>
        )}

        {isAdminOrGerente && (
          <>
            <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <CheckCircle className="mr-2 text-primary-500" size={20} />
                Etapas do Projeto
              </h3>

              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Defina as etapas padrão que aparecerão para novos clientes.</p>
                {defaultStages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => {
                        const newStages = [...defaultStages];
                        newStages[index].name = e.target.value;
                        setDefaultStages(newStages);
                      }}
                      className="flex-1 px-4 py-2 bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        const newStages = defaultStages.filter(s => s.id !== stage.id);
                        setDefaultStages(newStages);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      const newStages = [...defaultStages, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Nova Etapa' }];
                      setDefaultStages(newStages);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Adicionar Etapa
                  </button>
                  <button
                    onClick={async () => {
                      if (!effectiveOrgId) return;
                      try {
                        await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultStages }, { merge: true });
                        toast.success('Etapas salvas com sucesso!');
                      } catch (error) {
                        toast.error('Erro ao salvar etapas.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                  >
                    <CheckCircle size={16} />
                    Salvar Etapas
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <FileText className="mr-2 text-primary-500" size={20} />
                Formulário de Onboarding
              </h3>

              <div className="space-y-4">
                {onboardingQuestions.map((question, index) => (
                  <div key={question.id} className="flex flex-col gap-3 p-4 bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={question.text}
                          placeholder="Pergunta"
                          onChange={(e) => {
                            const newQ = [...onboardingQuestions];
                            newQ[index].text = e.target.value;
                            setOnboardingQuestions(newQ);
                          }}
                          className="w-full px-4 py-2 bg-transparent border-b border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-primary-500 outline-none"
                        />
                        <div className="flex items-center gap-4">
                          <select
                            value={question.type}
                            onChange={(e) => {
                              const newQ = [...onboardingQuestions];
                              newQ[index].type = e.target.value as any;
                              setOnboardingQuestions(newQ);
                            }}
                            className="px-3 py-1.5 bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-sm outline-none"
                          >
                            <option value="text" className="bg-zinc-900">Texto Curto</option>
                            <option value="textarea" className="bg-zinc-900">Texto Longo</option>
                            <option value="select" className="bg-zinc-900">Múltipla Escolha</option>
                            <option value="file" className="bg-zinc-900">Anexo de Arquivo (Logo/Imagens)</option>
                          </select>

                          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) => {
                                const newQ = [...onboardingQuestions];
                                newQ[index].required = e.target.checked;
                                setOnboardingQuestions(newQ);
                              }}
                              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                            />
                            Obrigatório
                          </label>
                        </div>

                        {question.type === 'select' && (
                          <input
                            type="text"
                            value={question.options || ''}
                            placeholder="Opções separadas por vírgula (ex: Azul, Verde, Vermelho)"
                            onChange={(e) => {
                              const newQ = [...onboardingQuestions];
                              newQ[index].options = e.target.value;
                              setOnboardingQuestions(newQ);
                            }}
                            className="w-full px-4 py-2 bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-sm outline-none"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const newQ = onboardingQuestions.filter(q => q.id !== question.id);
                          setOnboardingQuestions(newQ);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      const newQ = [...onboardingQuestions, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: '', type: 'text', required: false }];
                      setOnboardingQuestions(newQ as OnboardingQuestion[]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-gray-900 dark:text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    Adicionar Pergunta
                  </button>

                  <button
                    onClick={() => {
                      const newQ = [...onboardingQuestions, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: 'Logo da Empresa', type: 'file', required: false }];
                      setOnboardingQuestions(newQ as OnboardingQuestion[]);
                      toast.success('Pergunta de Logo adicionada!');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-400 rounded-xl transition-colors text-sm font-medium"
                  >
                    <ImageIcon size={16} />
                    Adicionar Pedido de Logo
                  </button>
                  <button
                    onClick={async () => {
                      if (!effectiveOrgId) return;
                      try {
                        await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { onboardingQuestions }, { merge: true });
                        toast.success('Formulário salvo com sucesso!');
                      } catch (error) {
                        toast.error('Erro ao salvar formulário.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                  >
                    <CheckCircle size={16} />
                    Salvar Formulário
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpen className="mr-2 text-primary-500" size={20} />
                Wiki Hub
              </h3>
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure o conteúdo principal de onboarding e ajuda da sua Wiki.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">ID do Artigo de Boas-vindas (Guia de Iniciante)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={beginnerGuideArticleId}
                      onChange={(e) => setBeginnerGuideArticleId(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: d4f9c8..."
                    />
                    <button
                      onClick={async () => {
                        if (!effectiveOrgId) return;
                        try {
                          await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { beginnerGuideArticleId }, { merge: true });
                          toast.success('Wiki configurada com sucesso!');
                        } catch (error) {
                          toast.error('Erro ao salvar ID da Wiki.');
                        }
                      }}
                      className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20 text-sm font-bold"
                    >
                      Salvar Wiki
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 italic">O ID pode ser encontrado na URL do artigo após selecioná-lo na Wiki.</p>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <FileText className="mr-2 text-primary-500" size={20} />
                Texto do Contrato Padrão
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Defina o texto que será carregado nativamente como base na geração de novos contratos.
                </p>
                <textarea
                  value={defaultContractText}
                  onChange={(e) => setDefaultContractText(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-y custom-scrollbar text-sm font-mono leading-relaxed"
                  placeholder="Digite as cláusulas do seu contrato aqui..."
                />
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={async () => {
                      if (!effectiveOrgId) return;
                      try {
                        await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { defaultContractText }, { merge: true });
                        toast.success('Contrato padrão salvo com sucesso!');
                      } catch (error) {
                        toast.error('Erro ao salvar contrato padrão.');
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                  >
                    <CheckCircle size={16} />
                    Salvar Contrato Padrão
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Globe className="mr-2 text-primary-500" size={20} />
                Página de Checkout
              </h3>
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure como sua página de vendas pública aparece para seus futuros clientes.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Título da Página</label>
                    <input
                      type="text"
                      value={checkoutTitle}
                      onChange={(e) => setCheckoutTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: Nossa Proposta Comercial"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Descrição / Subtítulo</label>
                    <textarea
                      value={checkoutDescription}
                      onChange={(e) => setCheckoutDescription(e.target.value)}
                      className="w-full h-24 px-4 py-2 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                      placeholder="Breve texto explicativo abaixo do título"
                    />
                  </div>
                </div>

                <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl">
                  <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-2">Seu Link Público</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/contratar/${effectiveOrgId}`}
                      className="flex-1 bg-transparent border-none text-sm text-gray-600 dark:text-gray-300 outline-none"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/contratar/${effectiveOrgId}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link copiado para a área de transferência!');
                      }}
                      className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                      title="Copiar Link"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Globe className="mr-2 text-primary-500" size={20} />
                Pesquisa de Satisfação (CSAT)
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Título da Pesquisa
                  </label>
                  <input
                    type="text"
                    value={csatTitle}
                    onChange={(e) => setCsatTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ex: Como foi seu atendimento?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pergunta de Feedback
                  </label>
                  <textarea
                    value={csatQuestion}
                    onChange={(e) => setCsatQuestion(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                    placeholder="Ex: Sua opinião é fundamental..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={async () => {
                      if (!effectiveOrgId) return;
                      try {
                        await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { 
                          checkoutTitle, 
                          checkoutDescription,
                          csatTitle,
                          csatQuestion
                        }, { merge: true });
                        toast.success('Configurações salvas!');
                      } catch (error) {
                        toast.error('Erro ao salvar configurações.');
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                  >
                    <CheckCircle size={16} />
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
            
            {isAdminOrGerente && (
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Star className="mr-2 text-primary-500" size={20} />
                  Matriz de Competências (Soft Skills)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Gerencie o pool global de habilidades comportamentais que todos os colaboradores poderão avaliar em seus perfis.
                </p>

                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newSoftSkill}
                    onChange={(e) => setNewSoftSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSoftSkill()}
                    className="flex-1 px-4 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Nova soft skill... (Ex: Comunicação, Liderança)"
                  />
                  <button
                    onClick={handleAddSoftSkill}
                    className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {softSkillsPool.map((skill) => (
                    <div 
                      key={skill}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-lg text-xs font-bold animate-in fade-in zoom-in duration-300"
                    >
                      {skill}
                      <button 
                        onClick={() => handleRemoveSoftSkill(skill)}
                        className="p-0.5 hover:bg-primary-500/20 rounded-md transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {softSkillsPool.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nenhuma soft skill cadastrada no pool global.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-red-500 mb-6 flex items-center">
            <LogOut className="mr-2" size={20} />
            Conta
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">Sair do Sistema</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Encerre sua sessão atual com segurança</p>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all font-bold shadow-lg shadow-red-500/20 active:scale-95"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
