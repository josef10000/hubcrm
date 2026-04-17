import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  onClick?: () => void;
  badge?: number;
}

export default function NavItem({ icon: Icon, label, path, onClick, badge }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      to={path}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
        isActive
          ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary-500/10 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white border border-transparent'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} aria-hidden="true" />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span 
          className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
          aria-label={`${badge} ${label === 'Meus Chamados' || label === 'Support' ? 'chamados pendentes' : 'itens pendentes'}`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
