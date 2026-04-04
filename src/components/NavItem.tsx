import React from 'react';
import { LucideIcon } from 'lucide-react';
import { CRMView } from '../contexts/CRMContext';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  view: CRMView;
  activeView: CRMView;
  onClick: (view: CRMView) => void;
  badge?: number;
}

export default function NavItem({ icon: Icon, label, view, activeView, onClick, badge }: NavItemProps) {
  const isActive = activeView === view;

  return (
    <button
      onClick={() => onClick(view)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
        isActive
          ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}
