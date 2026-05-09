import React from 'react';
import { BotCommand } from '@/helpers/botCommands';
import { Bot } from 'lucide-react';

interface SlashCommandSuggestionsProps {
  commands: BotCommand[];
  onSelect: (command: BotCommand) => void;
  query: string;
}

export default function SlashCommandSuggestions({ commands, onSelect, query }: SlashCommandSuggestionsProps) {
  if (commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
      <div className="p-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
        <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
          <Bot size={14} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">HubBot — Comandos</span>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
        {commands.map((cmd) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-500/10 dark:hover:bg-white/5 transition-colors group"
          >
            <span className="text-xl w-8 text-center">{cmd.icon}</span>
            <div className="flex-1 text-left">
              <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{cmd.name}</span>
              <p className="text-[11px] text-gray-500 mt-0.5">{cmd.description}</p>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Enter</span>
          </button>
        ))}
      </div>
    </div>
  );
}
