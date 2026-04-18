import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteStatus } from '../types';

export type CRMView = 'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map' | 'leads';

interface UIContextType {
  // Navigation
  view: CRMView;
  setView: (view: CRMView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Modo Foco (esconde sidebar automaticamente)
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;

  // Busca Global Unificada
  globalSearch: string;
  setGlobalSearch: (term: string) => void;

  // Search & Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: SiteStatus | 'Todos';
  setFilterStatus: (status: SiteStatus | 'Todos') => void;
  sortBy: 'recent' | 'alphabetical' | 'value';
  setSortBy: (sort: 'recent' | 'alphabetical' | 'value') => void;
  filterTagId: string;
  setFilterTagId: (tagId: string) => void;

  // Pagination
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  clientsPerPage: number;

  // Theme
  themeColor: string;
  setThemeColor: (color: string) => void;

  // Modals (Client)
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CRMView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('hubcrm-focus') === 'true');
  const [globalSearch, setGlobalSearch] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');
  const [filterTagId, setFilterTagId] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('hubcrm-theme') || 'orange');

  // Aplicar tema dinamicamente
  useEffect(() => {
    const root = document.documentElement;
    const themeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    themeClasses.forEach(c => root.classList.remove(c));
    root.classList.add(`theme-${themeColor}`);
    localStorage.setItem('hubcrm-theme', themeColor);
  }, [themeColor]);

  // Persistir Modo Foco
  useEffect(() => {
    localStorage.setItem('hubcrm-focus', String(focusMode));
  }, [focusMode]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, filterTagId]);

  const value: UIContextType = {
    view, setView,
    sidebarOpen, setSidebarOpen,
    focusMode, setFocusMode,
    globalSearch, setGlobalSearch,
    isModalOpen, setIsModalOpen,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    sortBy, setSortBy,
    filterTagId, setFilterTagId,
    currentPage, setCurrentPage, clientsPerPage,
    themeColor, setThemeColor,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
