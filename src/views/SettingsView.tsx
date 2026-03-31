import React from 'react';
import { Settings, CheckCircle, Trash2, Plus, FileText, Image as ImageIcon, LogOut } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { OnboardingQuestion } from '../types';

export default function SettingsView() {
  const { 
    churnRiskDays, 
    setChurnRiskDays, 
    themeColor, 
    setThemeColor, 
    defaultStages, 
    setDefaultStages, 
    onboardingQuestions, 
    setOnboardingQuestions 
  } = useCRM();

  const themes = [
    { id: 'orange', name: 'Laranja (Original)', color: 'bg-orange-500' },
    { id: 'blue', name: 'Azul', color: 'bg-blue-500' },
    { id: 'green', name: 'Verde', color: 'bg-green-500' },
    { id: 'purple', name: 'Roxo', color: 'bg-purple-500' },
    { id: 'rose', name: 'Rosa', color: 'bg-rose-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Configurações</h2>
        
        <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
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
                  if (!auth.currentUser) return;
                  try {
                    await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'preferences'), { defaultStages }, { merge: true });
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
                  if (!auth.currentUser) return;
                  try {
                    await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'preferences'), { onboardingQuestions }, { merge: true });
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
