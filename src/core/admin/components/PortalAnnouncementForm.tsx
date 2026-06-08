import React from 'react';
import { Megaphone } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface PortalAnnouncementFormProps {
  effectiveOrgId: string;
}

export default function PortalAnnouncementForm({ effectiveOrgId }: PortalAnnouncementFormProps) {
  const { globalAnnouncement, setGlobalAnnouncement } = useSettings(effectiveOrgId);

  const handleSaveAnnouncement = async () => {
    if (!effectiveOrgId) return;
    try {
      await setDoc(doc(db, 'organizations', effectiveOrgId), {
        announcement: globalAnnouncement
      }, { merge: true });
      toast.success('Aviso global do portal atualizado com sucesso!');
    } catch (err) {
      console.error("Erro ao salvar aviso do portal:", err);
      toast.error('Erro ao salvar aviso.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-left shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary-500" />
          Aviso Global (Portal do Cliente)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Este aviso aparecerá no topo do portal corporativo para todos os seus clientes. Use para comunicar recessos, manutenções, horários diferenciados de fim de ano ou atualizações importantes.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl">
            <div>
              <p className="font-medium text-gray-950 dark:text-white">Status do Aviso</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Exibir ou ocultar o comunicado no portal do cliente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={globalAnnouncement?.isActive || false}
                onChange={(e) => setGlobalAnnouncement?.({...globalAnnouncement, isActive: e.target.checked})}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Título do Aviso</label>
              <input 
                type="text" 
                value={globalAnnouncement?.title || ''}
                onChange={(e) => setGlobalAnnouncement?.({...globalAnnouncement, title: e.target.value})}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm outline-none"
                placeholder="Ex: Recesso de Fim de Ano"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Tipo de Destaque</label>
              <select 
                value={globalAnnouncement?.type || 'info'}
                onChange={(e) => setGlobalAnnouncement?.({...globalAnnouncement, type: e.target.value})}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm outline-none"
              >
                <option value="info" className="bg-[#0a0a0a] text-white">Informativo (Azul)</option>
                <option value="warning" className="bg-[#0a0a0a] text-white">Atenção / Importante (Amarelo)</option>
                <option value="success" className="bg-[#0a0a0a] text-white">Sucesso / Novidade (Verde)</option>
                <option value="new_feature" className="bg-[#0a0a0a] text-white">Destaque Geral (Laranja / Primário)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Mensagem do Comunicado</label>
            <textarea 
              value={globalAnnouncement?.message || ''}
              onChange={(e) => setGlobalAnnouncement?.({...globalAnnouncement, message: e.target.value})}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm outline-none min-h-[120px] resize-none custom-scrollbar leading-relaxed"
              placeholder="Descreva aqui os detalhes que serão lidos no topo do portal do cliente..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSaveAnnouncement}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-primary-500/20"
            >
              Salvar Aviso do Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
