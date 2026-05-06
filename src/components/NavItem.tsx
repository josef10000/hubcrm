import React from 'react';
import { LucideIcon, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUI } from '../contexts/UIContext';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  onClick?: () => void;
  badge?: number;
}

export default function NavItem({ icon: Icon, label, path, onClick, badge }: NavItemProps) {
  const location = useLocation();
  const { themeColor, pinnedItems, togglePinItem } = useUI();
  const isActive = location.pathname === path;
  const isPinned = pinnedItems.includes(path);

  return (
    <div className="group/item relative flex items-center gap-1">
      <Link
        to={path}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
          themeColor === 'cyberpunk' ? 'glitch-hover' : ''
        } ${
          isActive
            ? 'bg-primary-500/10 text-primary-400 shadow-sm border border-primary-500/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon size={18} aria-hidden="true" className={isActive ? 'text-primary-400' : 'text-gray-500 group-hover/item:text-gray-300'} />
          <span className="text-sm font-medium tracking-wide">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span 
            className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
            aria-label={`${badge} ${label === 'Meus Chamados' || label === 'Support' ? 'chamados pendentes' : 'itens pendentes'}`}
          >
            {badge}
          </span>
        )}
      </Link>
      
      {/* Botão de Pin (Favoritar) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePinItem(path);
        }}
        className={`p-2 rounded-lg transition-all ${
          isPinned 
          ? 'text-amber-500 opacity-100' 
          : 'text-gray-600 opacity-0 group-hover/item:opacity-100 hover:text-amber-400 hover:bg-amber-500/10'
        }`}
        title={isPinned ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Star size={14} fill={isPinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
