import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { Client } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { useUI } from '../../contexts/UIContext';
import { useNavigate } from 'react-router-dom';

interface AlertPanelsProps {
  overdueClients: Client[];
  comboRenewalClients: Client[];
}

export default function AlertPanels({ overdueClients, comboRenewalClients }: AlertPanelsProps) {
  const { setEditingClient } = useCRM();
  const { setIsModalOpen, setFilterStatus } = useUI();
  const navigate = useNavigate();

  return (
    <>
      {overdueClients.length > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Atenção: {overdueClients.length} cliente(s) inadimplente(s)</h3>
              <p className="text-sm text-red-200/80">Verifique a situação e envie um lembrete de cobrança.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueClients.slice(0, 3).map(c => (
              <button 
                key={c.id} 
                onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm rounded-lg transition-colors flex items-center"
              >
                {c.name.split(' ')[0]}
              </button>
            ))}
            {overdueClients.length > 3 && (
              <button 
                onClick={() => { setFilterStatus('Inadimplente'); navigate('/'); }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
              >
                + {overdueClients.length - 3}
              </button>
            )}
          </div>
        </div>
      )}

      {comboRenewalClients.length > 0 && (
        <div className="mb-8 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl mr-4 shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Renovação de Combo: {comboRenewalClients.length} cliente(s)</h3>
              <p className="text-sm text-purple-200/80">Clientes com plano anual combo vencendo em breve. Entre em contato para renovar.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {comboRenewalClients.slice(0, 3).map(c => (
              <button 
                key={c.id} 
                onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm rounded-lg transition-colors flex items-center"
              >
                {c.name.split(' ')[0]}
              </button>
            ))}
            {comboRenewalClients.length > 3 && (
              <button 
                onClick={() => { navigate('/'); }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
              >
                + {comboRenewalClients.length - 3}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
