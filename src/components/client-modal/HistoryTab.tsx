import React from 'react';
import { CheckCircle, Clock, Trash2 } from 'lucide-react';
import { ClientLog } from '../../types';

interface HistoryTabProps {
  logs: ClientLog[];
  newLogText: string;
  setNewLogText: (text: string) => void;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function HistoryTab({ logs, newLogText, setNewLogText, setFormData }: HistoryTabProps) {
  const addLog = () => {
    if (!newLogText.trim()) return;
    const newLog = { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: newLogText.trim(), date: Date.now() };
    setFormData((prev: any) => ({ ...prev, logs: [newLog, ...(prev.logs || [])] }));
    setNewLogText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-white/10 pb-2">Adicionar Anotação</h3>
        <div className="flex gap-3">
          <input 
            type="text" 
            value={newLogText} 
            onChange={(e) => setNewLogText(e.target.value)} 
            placeholder="Descreva a interação, alteração ou nota..." 
            className="flex-1 px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500"
            onKeyDown={(e) => { if (e.key === 'Enter' && newLogText.trim()) { e.preventDefault(); addLog(); } }}
          />
          <button 
            type="button"
            disabled={!newLogText.trim()}
            onClick={addLog}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 dark:text-white rounded-xl font-medium transition-all"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Histórico</h3>
        {(!logs || logs.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma anotação registrada para este cliente.
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="bg-black/20 border border-white/5 p-4 rounded-xl relative group">
                <p className="text-gray-200 text-sm mb-2">{log.text}</p>
                <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString('pt-BR')}</p>
                <button 
                  type="button"
                  onClick={() => {
                    setFormData((prev: any) => ({ ...prev, logs: prev.logs?.filter((l: any) => l.id !== log.id) }));
                  }}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
