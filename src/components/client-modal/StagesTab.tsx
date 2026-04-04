import React from 'react';
import { CheckCircle } from 'lucide-react';
import { ClientStage } from '../../types';

interface StagesTabProps {
  stages: ClientStage[];
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function StagesTab({ stages, setFormData }: StagesTabProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">Etapas do Projeto</h3>
      <div className="space-y-4">
        {stages?.map((stage, index) => (
          <div key={stage.id} className="flex flex-col p-4 bg-black/20 border border-white/5 rounded-xl gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${stage.completed ? 'bg-green-500/20 text-green-500' : 'bg-primary-500/20 text-primary-500'}`}>
                  {stage.completed ? <CheckCircle size={16} /> : index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{stage.name}</p>
                  {stage.approvedAt && <p className="text-xs text-gray-500">Aprovado em: {new Date(stage.approvedAt).toLocaleString('pt-BR')}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newStages = [...(stages || [])];
                  newStages[index].completed = !newStages[index].completed;
                  if (!newStages[index].completed) newStages[index].approvedAt = null;
                  setFormData((prev: any) => ({ ...prev, stages: newStages }));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stage.completed ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/10'}`}
              >
                {stage.completed ? 'Concluído' : 'Marcar Concluído'}
              </button>
            </div>
            <div className="pl-11 pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Link para aprovação (ex: Figma, Drive)" 
                value={stage.link || ''}
                onChange={(e) => {
                  const newStages = [...(stages || [])];
                  newStages[index].link = e.target.value;
                  setFormData((prev: any) => ({ ...prev, stages: newStages }));
                }}
                className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
              <input 
                type="text" 
                placeholder="Descrição ou instrução para o cliente" 
                value={stage.description || ''}
                onChange={(e) => {
                  const newStages = [...(stages || [])];
                  newStages[index].description = e.target.value;
                  setFormData((prev: any) => ({ ...prev, stages: newStages }));
                }}
                className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          </div>
        ))}
        {(!stages || stages.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            Nenhuma etapa definida para este cliente.
          </div>
        )}
      </div>
    </div>
  );
}
