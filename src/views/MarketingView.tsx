import React from 'react';
import { Megaphone } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function MarketingView() {
  const { user, globalAnnouncement, setGlobalAnnouncement } = useCRM();

  const handleSaveAnnouncement = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'global'), {
        announcement: globalAnnouncement
      }, { merge: true });
      toast.success('Aviso global atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar aviso.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary-500" />
          Aviso Global (Portal do Cliente)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Este aviso aparecerá no topo do portal de todos os seus clientes. Use para comunicar recessos, novos serviços ou atualizações importantes.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Status do Aviso</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ativar ou desativar o aviso no portal</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalAnnouncement.isActive}
                onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, isActive: e.target.checked})}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Aviso</label>
              <input 
                type="text" 
                value={globalAnnouncement.title}
                onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, title: e.target.value})}
                className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Recesso de Fim de Ano"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Aviso</label>
              <select 
                value={globalAnnouncement.type}
                onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, type: e.target.value})}
                className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="info" className="bg-[#0a0a0a] text-white">Informativo (Azul)</option>
                <option value="warning" className="bg-[#0a0a0a] text-white">Atenção (Amarelo)</option>
                <option value="success" className="bg-[#0a0a0a] text-white">Novidade/Sucesso (Verde)</option>
                <option value="new_feature" className="bg-[#0a0a0a] text-white">Lançamento (Primária)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
            <textarea 
              value={globalAnnouncement.message}
              onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, message: e.target.value})}
              className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none min-h-[100px] resize-none"
              placeholder="Detalhes do aviso..."
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveAnnouncement}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
            >
              Salvar Aviso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
