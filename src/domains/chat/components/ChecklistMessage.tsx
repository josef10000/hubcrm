import React from 'react';
import { CheckSquare, Square, Award } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
}

interface ChecklistMessageProps {
  messageId: string;
  chatId: string;
  orgId: string;
  userId: string;
  userName: string;
  items: ChecklistItem[];
}

export const ChecklistMessage: React.FC<ChecklistMessageProps> = ({
  messageId,
  chatId,
  orgId,
  userId,
  userName,
  items = []
}) => {
  const toggleChecklistItem = useChatStore(state => state.toggleChecklistItem);

  const handleToggle = async (itemId: string) => {
    await toggleChecklistItem(orgId, chatId, messageId, itemId, userId, userName);
  };

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-3 w-full max-w-md p-1">
      {/* Progresso de Conclusão */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
          <span>Progresso das Tarefas</span>
          <span className="text-violet-600 dark:text-violet-400">{completedCount} de {items.length} ({progressPercent}%)</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lista de Itens */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all duration-200 group relative ${
              item.completed
                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-violet-500/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50'
            }`}
          >
            <span className="flex-shrink-0 mt-0.5 transition-transform duration-200 active:scale-75">
              {item.completed ? (
                <CheckSquare className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
              ) : (
                <Square className="w-4.5 h-4.5 text-zinc-400 dark:text-zinc-600 group-hover:text-violet-500" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`text-xs block leading-relaxed break-words font-medium transition-all duration-300 ${
                item.completed
                  ? 'text-zinc-400 dark:text-zinc-500 line-through decoration-emerald-500/40'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                {item.text}
              </span>
              {item.completed && item.completedBy && (
                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-medium text-emerald-600/80 dark:text-emerald-400/80 bg-emerald-100/40 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                  <Award className="w-2.5 h-2.5" />
                  Feito por {item.completedBy}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
