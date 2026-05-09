import React from 'react';
import { Trash2, User, Monitor, Laptop, Key, HelpCircle } from 'lucide-react';
import { Asset } from '../../types/people';
import { format } from 'date-fns';

interface AssetCardProps {
  asset: Asset;
  user: any;
  isAdminOrManager: boolean;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, user, isAdminOrManager, onDelete }: AssetCardProps) {
  const getCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'Hardware': return Laptop;
      case 'Software': return Monitor;
      case 'Acesso': return Key;
      default: return HelpCircle;
    }
  };

  const Icon = getCategoryIcon(asset.category);

  return (
    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-[2rem] shadow-xl group hover:border-primary-500 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-primary-500/10 text-primary-500`}>
          <Icon size={24} />
        </div>
        {isAdminOrManager && (
          <button 
            onClick={() => onDelete(asset.id)} 
            className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <h4 className="font-bold text-lg mb-1 dark:text-white">{asset.name}</h4>
      <p className="text-xs text-gray-400 mb-4">{asset.serialNumber || 'Sem serial'}</p>
      
      <div className="flex items-center gap-3 p-3 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={16} className="text-gray-400" />}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-bold truncate dark:text-white">{user?.displayName || 'Desconhecido'}</p>
          <p className="text-[10px] text-gray-500">Atribuído em {format(asset.assignedAt, 'dd/MM/yyyy')}</p>
        </div>
        <span className={`ml-auto text-[9px] font-black px-2 py-1 rounded-lg ${asset.status === 'Em uso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
          {asset.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
