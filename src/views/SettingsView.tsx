import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { useUI } from '../contexts/UIContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function SettingsView() {
  const { themeColor, setThemeColor } = useUI();
  const {
    churnRiskDays,
    setChurnRiskDays,
    effectiveOrgId,
  } = useCRM();

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
            
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!effectiveOrgId) return;
                  try {
                    await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { churnRiskDays }, { merge: true });
                    toast.success('Preferências salvas com sucesso!');
                  } catch (error) {
                    toast.error('Erro ao salvar preferências.');
                  }
                }}
                className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors"
              >
                Salvar Aparência
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
